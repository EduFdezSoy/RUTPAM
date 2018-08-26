/* 
 * The MIT License
 *
 * Copyright 2018 Nestor Manuel Lora Romero <nestorlora@geeklab.es>.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/* global emt_proxy_url, url_red_icon, url_orange_icon, url_white_icon, ttl_rate_new, refresh_rate, ttl_rate_default, ttl_rate_old, L */

/**
 * @description Variable global para la versión del programa
 * @type String
 */
var rutpam_version = "4.7";

/**
 * @description Variable global para almacenar el timer maestro
 * @type JS_Timer
 */
var timer;

/**
 * @description Variable global para almacenar el mapa
 * @type L.map
 */
var map;

/**
 * @description Tiempo de vida para buses nuevos (verde)(al alcanzar default_ttl se vuelven blancos)
 * @type int
 */
var ttl_new = ttl_rate_new/refresh_rate;

/**
 * @description Número de actualizaciones fallidas sin aparecer para darlo por muerto
 * @type Int
 */
var default_ttl = ttl_rate_default/refresh_rate;

/**
 * @description Número de actualizaciones fallidas sin aparecer para indicar que el bus probablemente haya desaparecido (color rojo)
 * @type Int
 */
var ttl_old = ttl_rate_old/refresh_rate;

/**
 * @description Tabla de líneas cargadas de la EMT
 * @type Array
 * @param {Int} codLinea Código interno de la línea
 * @param {String} userCodLinea Nombre corto de la línea (1, C2, N3)
 * @param {String} nombreLinea Nombre largo de la línea (Alameda-Churriana)
 * @param {String} cabeceraIda Nombre de la cabecera donde empieza la ida
 * @param {String} cabeceraVta Nombre de la cabecera donde empieza la vuelta
 * @param {Array} paradasIda Array de paradas a la ida {codPar,orden}
 * @param {Array} paradasVta Array de paradas a la vuelta {codPar, orden}
 * @param {...} trazadoIda
 * @param {...} trazadoVta
 * @param {Bool} getBuses
 * @param {Bool} getIda
 * @param {Bool} getVta
 */
var lineas_emt = [];

/**
 * @description Tabla de autobuses en servicio
 * @type Array
 * @param {Int} codBus Nº de coche, identificador
 * @param {Int} codLinea Código interno de la línea que sirve
 * @param {Int} sentido Sentido de la línea que está recorriendo actualmente
 * @param {Int} codParIni Código de la última parada a la que ha llegado
 * @param {Float} latitud Ubicación
 * @param {Float} longitud Ubicación
 * @param {...} marker Objeto del marcador asociado al coche
 * @param {...} popup Objeto del cuadro de información adicional del coche
 * @param {...} ttl Time-to-live del coche
 */
var autobuses = [];

/**
 * @description Tabla de paradas cargadas
 * @type Array
 * @param {Int} codPar Código de la parada
 * @param {String} nombreParada Nombre de la parada
 * @param {String} direccion Dirección postal de la parada
 * @param {Array} servicios Array de servicios {codLinea, sentido, espera} que hay en esa parada
 * @param {Float} latitud Ubicación
 * @param {Float} longitua Ubicación
 * @param {...} marker Objeto del marcador asociado a la parada
 * @param {...} popup Objeto del cuadro de información asociado a la parada
 */
var paradas = [];

/**
 * Función de puesta en marcha cuando finaliza la carga del DOM
 */
$(document).ready(function(){
	initMap(); // Inicializamos el mapa y todo el layout
	document.title = "RUTPAM "+rutpam_version; // Seteamos el título del documento
});

/**
 * @description Puesta en marcha del mapa y los elementos que se le superponen
 * @returns {null}
 */
function initMap() {
	var osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'; // URL del servidor cartográfico
	var osm = new L.TileLayer(osmUrl); // Creamos la capa de cartografía
	map = L.map('map', {
		center: [36.7121977, -4.4370495], // Centro del mapa sobre málaga
		zoom: 13, // Nivel de zoom para ver todo el área metropolitana
		closePopupOnClick: false, // Deshabilitamos que los popups se cierren al hacer click en cualquier otro sitio fuera
		layers: osm, // Añadimos la capa de cartografía
		attributionControl: false // Deshabilitamos el footer de copyright porque ya tenemos una ventana para ello
	});
	$("#lineas").html(ControlRUTPAM($("<div>"))); // Rellenamos el div del panel de control con lo que devuelve ControlRUTPAM()
	$("#tablaLineas").hide(); // Ocultamos la tabla de líneas porque todavía está vacía
	verCopyright(); // Mostramos el "Acerca de RUTPAM"
	return null;
}

/**
 * @description Función asíncrona para refrescar los datos periódicamente
 * @returns {null}
 */
function motor(){
	for(var y = 0; y < lineas_emt.length; y++){ // Para todo el array de líneas
		if(lineas_emt[y].getBuses){ // Si hemos activado el refresco de los buses
			setTimeout(getUbicaciones, y*30, lineas_emt[y].codLinea); // Refrescar los buses (con un tiempo de diferencia para hacerlo escalonadamente)
		}
	}
	reducirTTL(); // Reducir TTLs, cambiar iconos y limpiar buses viejos
	return null;
}

/**
 * @description Función para detener el motor
 * @returns {null}
 */
function stop(){
	clearInterval(timer);
	$("#pause").attr("disabled", true);
	$("#play").attr("disabled", false);
	$("#refresh").attr("disabled", false);
	return null;
}

/**
 * @description Función para arrancar el motor
 * @returns {null}
 */
function start(){
	timer = setInterval(motor, refresh_rate*1000);
	$("#pause").attr("disabled", false);
	$("#play").attr("disabled", true);
	$("#refresh").attr("disabled", true);
	return null;
}

/**
 * @description Función para limpiar los buses que no estamos siguiendo, llevan mucho sin refrescarse, o han desaparecido
 * @returns {null}
 */
function reducirTTL(){
	var pos = 0; // Empezamos por el principio
	while(pos < autobuses.length){ // Para todos los autobuses
		autobuses[pos].ttl--; // Decrementar TTL
		if(autobuses[pos].ttl <= 0){ // SI su vida útil ha expirado
			console.log("DROP "+autobuses[pos].codBus); // Registramos que se pierde
			autobuses[pos].marker.remove(); // Quitamos el marcador del mapa
			autobuses.splice(pos, 1); // Borramos el objeto del array
		}else if(lineas_emt[findLinea(autobuses[pos].codLinea)].getBuses === false){ // O SI no estamos haciendo un seguimiento de esa línea
			autobuses[pos].marker.remove(); // Quitamos el marcador del mapa
			pos++; // Avanzamos de posición
		}else if(autobuses[pos].ttl <= ttl_old){ // O SI el TTL es bajo y el bus lleva rato sin refrescarse
			autobuses[pos].marker.setIcon(busIconContent(autobuses[pos], 2)); // Cambiamos el icono para que aparezca como no-actualizado
			pos++; // Avanzamos de posición
		}else{ // O Todo está bien
			pos++; // Avanzamos de posición
		}
	}
	return null;
}

/**
 * @description Función que llama a la API para cargar las líneas. Cambia algunos elementos para preparar la interfaz.
 * @returns {null}
 */
function getLineas(){
	$("#getLineas").remove(); // Eliminamos el botón para pedir las líneas
	// Petición AJAX
	$.getJSON({
		url: emt_proxy_url+'/services/lineas/'
	}).done(function (response, status){
		if(status === "success"){
			lineas_emt = [];
			$("#tablaLineas").show();
			for(var i = 0; i<response.length; i++){
				addLinea(response[i]); // Para cada línea de la respuesta la pasamos por addLinea()
			}
			inicialiarParadas();
			motor(); // Llamamos la primera vez al motor
			start(); // Programamos que se ejecute periódicamente
			// Mostramos la botoner de control del motor
			$("#play").css("display", "inline-block");
			$("#refresh").css("display", "inline-block");
			$("#pause").css("display", "inline-block");
		}
	});
	return null;
};

/**
 * @description Función que llama a la API para cargar los trazados de una linea dada. A continuación los muestra sobre el mapa según el usuario lo haya indicado
 * @param {Int} codLinea
 * @returns {null}
 */
function getTrazados(codLinea){
	// Cambiamos el estado a deshabilitado a la espera de recibir los datos
	$("#botonIda"+codLinea).prop("indeterminate", false).prop("disabled", true).off('click');
	$("#botonVta"+codLinea).prop("indeterminate", false).prop("disabled", true).off('click');
	// Llamada AJAX
	$.getJSON({
		url: emt_proxy_url+'/services/trazados/?codLinea='+codLinea+'&sentido=1'
	}).done(function (response, status){
		if(status === "success" && response.length > 0){
			var posLinea = findLinea(codLinea); // Almacenamos la posición en lineas_emt[] para uso más cómodo
			var trazado = []; // Creamos un array con los puntos de latitud y longitud del polígono
			for(var a = 0; a < response.length; a++){
				trazado.push({lat: response[a].latitud, lng: response[a].longitud});  // Rellenamos con los datos de la respuesta
			}
			lineas_emt[posLinea].trazadoIda = L.polyline(trazado, {
				color: '#1E3180', // Fijamos el color de la ida
				opacity: 1.0, // Opacidad
				weight: 3 // Grosor
			});
			lineas_emt[posLinea].getIda = true;
			$("#botonIda"+codLinea).prop("disabled", false); 
			$("#botonIda"+codLinea).change(function(){
				var isChecked = $(this).is(':checked');
				if(isChecked){
					showTrazado(codLinea, 1); // Mostramos el trazado
				}else{
					hideTrazado(codLinea, 1); // Ocultamos el trazado
				}
			});
			$("#botonIda"+codLinea).trigger("change");
		}
	});
	$.getJSON({
		url: emt_proxy_url+'/services/trazados/?codLinea='+codLinea+'&sentido=2'
	}).done(function (response, status){
		if(status === "success" && response.length > 0){
			var posLinea = findLinea(codLinea); // Almacenamos la posición en lineas_emt[] para uso más cómodo
			var trazado = []; // Creamos un array con los puntos de latitud y longitud del polígono
			for(var a = 0; a < response.length; a++){
				trazado.push({lat: response[a].latitud, lng: response[a].longitud}); // Rellenamos con los datos de la respuesta
			}
			lineas_emt[posLinea].trazadoVta = L.polyline(trazado, {
				color: '#4876FE', // Fijamos el color de la vuelta
				opacity: 1.0, // Opacidad
				weight: 3 // Grosor
			});
			lineas_emt[posLinea].getVta = true;
			$("#botonVta"+codLinea).prop("disabled", false);
			$("#botonVta"+codLinea).change(function(){
				var isChecked = $(this).is(':checked');
				if(isChecked){
					showTrazado(codLinea, 2); // Mostramos el trazado
				}else{
					hideTrazado(codLinea, 2); // Ocultamos el trazado
				}
			});
			$("#botonVta"+codLinea).trigger("change");
		}		
	});
	return null;
}

function getUbicaciones(codLinea){
	$.getJSON({
		url: emt_proxy_url+'/services/buses/?codLinea='+codLinea
	}).done(function (response, status){
		if(status === "success"){
			for(var x = 0; x < response.length; x++){
				pos = findBus(response[x].codBus);
				if(pos !== null){
					updateBus(response[x], pos);
				}else{
					addBus(response[x]);
				}
			}
			$("#cont"+codLinea).text(response.length);
		}		
	});
};

function addBus(Bus){
	console.log("ADDED "+Bus.codBus);
	var coordenadas = {lat: Bus.latitud , lng: Bus.longitud};
	var data = {
		marker: L.marker(coordenadas, {
			icon: busIconContent(Bus, 1)
		}),
		popup: L.popup({autoPan: false, autoClose: false}).setContent(busPopupContent(Bus)),
		codBus: Bus.codBus,
		codLinea: Bus.codLinea,
		sentido: Bus.sentido,
		codParIni: Bus.codParIni,
		latitud: Bus.latitud,
		longitud: Bus.longitud,
		ttl: ttl_new
	};
	var pos = autobuses.push(data)-1;
	autobuses[pos].marker.bindPopup(autobuses[pos].popup);
	autobuses[pos].marker.addTo(map);
}

function updateBus(Bus, pos){
	var coordenadas = {lat: Bus.latitud , lng: Bus.longitud};
	if(!autobuses[pos].marker.getLatLng().equals(coordenadas)){
		autobuses[pos].marker.setLatLng(coordenadas);
	}
	autobuses[pos].codLinea = Bus.codLinea;
	autobuses[pos].sentido = Bus.sentido;
	autobuses[pos].codParIni = Bus.codParIni;
	autobuses[pos].latitud = Bus.latitud;
	autobuses[pos].longitud = Bus.longitud;
	autobuses[pos].popup.setContent(busPopupContent(Bus));
	autobuses[pos].marker.addTo(map);
	if(autobuses[pos].ttl < default_ttl){
		autobuses[pos].ttl = default_ttl;
		autobuses[pos].marker.setIcon(busIconContent(autobuses[pos], 0));
	}
}

function addLinea(lin){
	var linea = {
		codLinea: lin.codLinea,
		userCodLinea: lin.userCodLinea.replace(/^F-/, "F"),
		nombreLinea: lin.nombreLinea.replace(/(\(F\))|(\(?F-[0-9A-Z]{1,2}\)$)/, ""),
		cabeceraIda: lin.cabeceraIda, 
		cabeceraVta: lin.cabeceraVuelta,
		paradasIda: [],
		paradasVta: [],
		getIda: false,
		getVta: false,
		getBuses: false
	};
	for(var a = 0; a < lin.paradas.length; a++){
		addParada(lin.paradas[a].parada, linea.codLinea, lin.paradas[a].sentido);
		if(lin.paradas[a].sentido === 1){
			linea.paradasIda.push({
				codPar: lin.paradas[a].parada.codParada,
				orden: lin.paradas[a].orden
			});
		}
		if(lin.paradas[a].sentido === 2){
			linea.paradasVta.push({
				codPar: lin.paradas[a].parada.codParada,
				orden: lin.paradas[a].orden
			});
		}
	}
	lineas_emt.push(linea);
	//getTrazados(linea.codLinea);
	
	var fila = $("<tr>");
	var botonIda = $("<input>", {
		"type": "checkbox",
		"id": "botonIda"+linea.codLinea
	}).prop('checked', false).prop("indeterminate", true).click(function(){
		getTrazados(linea.codLinea);
	});
	var botonVta = $("<input>", {
		"type": "checkbox",
		"id": "botonVta"+linea.codLinea,
		"checked": true
	}).prop('checked', false).prop("indeterminate", true).click(function(){
		getTrazados(linea.codLinea);
	});
	var botonBus = $("<input>", {
		"type": "checkbox",
		"id": "botonBus"+linea.codLinea
	}).prop('checked', false).click(function(){
		enableBusUpdate(linea.codLinea);
	});
	$(fila).append($("<td>").append(botonIda));
	$(fila).append($("<td>").append(botonVta));
	$(fila).append($("<td>").append(botonBus));
	$(fila).append($("<td>").append(lineaIcon(linea.userCodLinea, "3x")));
	$(fila).append($("<td>").append($("<a>", {text: linea.nombreLinea, href: "#!"}).click(function(){verInfoLinea(linea.codLinea);})));
	$(fila).append($("<td>").append($("<p>").attr('id', "cont"+linea.codLinea)));

	$("#tablaLineas").append(fila);
}

function addParada(parada, codLinea, sentido){
	var pos = findParada(parada.codParada);
	if(pos !== null){
		paradas[pos].servicios.push({
			codLinea: codLinea,
			sentido: sentido,
			espera: null
		});
	}else{
		pos = paradas.push({
			codPar: parada.codParada,
			nombreParada: parada.nombreParada,
			direccion: parada.direccion,
			servicios: [],
			latitud: parada.latitud,
			longitud: parada.longitud,
			marker: null,
			popup: null
		})-1;
		paradas[pos].servicios.push({
			codLinea: codLinea,
			sentido: sentido,
			espera: null
		});
	}
}

function inicialiarParadas(){
	for(var a = 0; a < paradas.length; a++){
		paradas[a].marker = L.marker({lat: paradas[a].latitud, lng: paradas[a].longitud}, {
			icon: paradaIconContent(paradas[a].codPar)
		});
		paradas[a].popup = L.popup({autoPan: false, autoClose: false}).setContent(paradaPopupContent(paradas[a].codPar));
		paradas[a].marker.bindPopup(paradas[a].popup);
		paradas[a].marker.addTo(map);
	}
}

function verInfoLinea(id){
	var linea = lineas_emt[findLinea(id)];
	$("#ventana").hide();
	$("#infoContent").empty();
	$("#infoContent").append($("<h3>", {text: "Línea "+linea.userCodLinea}).css("text-align", "center"));
	$("#infoContent").append($("<h4>", {text: linea.nombreLinea}).css("text-align", "center"));
	$("#infoContent").append($("<p>", {text: "Id. interno EMT: "+linea.codLinea}));
	if(linea.getIda){
		$("#infoContent").append($("<p>", {text: "Longitud Ida: "+Math.floor(distanciaTrazado(linea.trazadoIda))+" m"}));
	}
	if(linea.getVta){
		$("#infoContent").append($("<p>", {text: "Longitud Vuelta: "+Math.floor(distanciaTrazado(linea.trazadoVta))+" m"}));
	}
	var tabla = $("<table>");
	var cabecera = $("<tr>");
	if(linea.cabeceraVta !== null){
		cabecera.append($("<th>", {text: "Sentido"}).attr("colspan", 3).append($("<br>")).append(linea.cabeceraVta));
		cabecera.append($("<th>", {text: "Sentido"}).attr("colspan", 3).append($("<br>")).append(linea.cabeceraIda));
	}else{
		cabecera.append($("<th>", {text: "Sentido"}).attr("colspan", 3).append($("<br>")).append(linea.cabeceraIda));
	}
	tabla.append(cabecera);
	for(var a = 0; a <= Math.max(linea.paradasIda.length, linea.paradasVta.length); a++){
		var fila = $("<tr>");
		if(a < linea.paradasIda.length){
			var codPar = linea.paradasIda[a].codPar;
			fila = generarFilaParada(fila, codPar, linea.codLinea);
		}else if(a === linea.paradasIda.length && linea.cabeceraVta !== null){
			var codPar = linea.paradasVta[0].codPar;
			fila = generarFilaParada(fila, codPar, linea.codLinea);
		}else if(linea.cabeceraVta !== null){
			fila = generarFilaParada(fila);
		}
		if(linea.cabeceraVta !== null){
			if(a < linea.paradasVta.length){
				var codPar = linea.paradasVta[a].codPar;
				fila = generarFilaParada(fila, codPar, linea.codLinea);
			}else if(a === linea.paradasVta.length && linea.cabeceraVta !== null){
				var codPar = linea.paradasIda[0].codPar;
				fila = generarFilaParada(fila, codPar, linea.codLinea);
			}else{
				fila = generarFilaParada(fila);
			}
		}
		tabla.append(fila);
	}
	$("#infoContent").append(tabla);
	$("#ventana").show();
	return null;
}

function generarFilaParada(div, codPar, codLinea){
	if(codPar !== undefined && codPar !== null){
		var nombre = paradas[findParada(codPar)].nombreParada;
		div.append($("<td>").append($("<a>", {text: codPar, href: "#!"}).click(function(){verInfoParada(codPar)})));
		div.append($("<td>", {html: acortarParada(nombre)}));
		div.append(extrarCorrespondencias($("<td>"),codPar, codLinea));
	}else{
		div.append($("<td>")).append($("<td>")).append($("<td>"));
	}
	return div;
}

function verInfoParada(id){
	var parada = paradas[findParada(id)];
	$("#ventana").hide();
	$("#infoContent").empty();
	$("#infoContent").append($("<h3>", {text: "Parada "+parada.codPar}).css("text-align", "center"));
	$("#infoContent").append($("<h4>", {text: parada.nombreParada}).css("text-align", "center"));
	$("#infoContent").append($("<p>", {text: "Dirección: "+parada.direccion}));
	var tabla = $("<table>");
	var cabecera = $("<tr>");
	cabecera.append($("<th>", {text: "Servicios"}).attr("colspan", /*3*/2));
	tabla.append(cabecera);
	for(var a = 0; a < parada.servicios.length; a++){
		var linea = lineas_emt[findLinea(parada.servicios[a].codLinea)]
		var sentido;
		switch (parada.servicios[a].sentido){
			case 1:
				if(linea.cabeceraVta !== null){
					sentido = linea.cabeceraVta;
				}else{
					sentido = linea.cabeceraIda;
				}
				break;
			case 2:
				sentido = linea.cabeceraIda;
				break;
			default:
				sentido = "-";
				break;
		}
		var fila = $("<tr>");
		fila.append($("<td>", {html: lineaIcon(linea.userCodLinea, "3x", linea.codLinea)}));
		fila.append($("<td>", {text: sentido}));
		//fila.append($("<td>", {text: "??? min."}).css("text-align", "right"));
		tabla.append(fila);
	}
	$("#infoContent").append(tabla);
	$("#ventana").show();

	return null;
}

function enableBusUpdate(codLinea){
	lineas_emt[findLinea(codLinea)].getBuses = true;
	$("#botonBus"+codLinea).attr("checked", true);
	$("#botonBus"+codLinea).unbind("click");
	$("#botonBus"+codLinea).click(function(){
		disableBusUpdate(codLinea);
	});
}

function disableBusUpdate(codLinea){
	lineas_emt[findLinea(codLinea)].getBuses = false;
	$("#botonBus"+codLinea).attr("checked", false);
	$("#botonBus"+codLinea).unbind("click");
	$("#botonBus"+codLinea).click(function(){
		enableBusUpdate(codLinea);
	});
}

/**
 * Al ser llamada, añade al mapa el trazado de la línea indicada y prepara el botón para realizar la acción contraria cuando vuelva a ser llamado
 * @param {Number} codLinea
 * @param {Number} sentido
 */
function showTrazado(codLinea, sentido){
	if(sentido === 1){
		lineas_emt[findLinea(codLinea)].trazadoIda.addTo(map);
	}else if(sentido === 2){
		lineas_emt[findLinea(codLinea)].trazadoVta.addTo(map);
	}
}

/**
 * Al ser llamada, borra del mapa el trazado de la línea indicada y prepara el botón para realizar la acción contraria cuando vuelva a ser llamado
 * @param {Number} codLinea
 * @param {Number} sentido
 */
function hideTrazado(codLinea, sentido){
	if(sentido === 1){
		lineas_emt[findLinea(codLinea)].trazadoIda.remove();
		$("#botonIda"+codLinea).attr("checked", false);
		$("#botonIda"+codLinea).unbind("click");
		$("#botonIda"+codLinea).click(function(){
			showTrazado(codLinea, sentido);
		});
	}else if(sentido === 2){
		lineas_emt[findLinea(codLinea)].trazadoVta.remove();
		$("#botonVta"+codLinea).attr("checked", false);
		$("#botonVta"+codLinea).unbind("click");
		$("#botonVta"+codLinea).click(function(){
			showTrazado(codLinea, sentido);
		});
	}
}

/**
 * Busca la posición de una línea dentro de lineas_emt[]
 * @param {Number} codLinea
 * @returns {Number} Posición en lineas_emt[]
 */
function findLinea(codLinea){
	var pos = 0;
	var found = false;
	while(pos < lineas_emt.length && !found){
		if(lineas_emt[pos].codLinea === codLinea){
			found = true;
		}else{
			pos++;
		}
	}
	if(pos >= lineas_emt.length){
		return null;
	}else{
		return pos;
	}
}

/**
 * Busca la posición de un coche dentro de autobuses[]
 * @param {Number} codBus
 * @returns {Number} Posición en autobuses[]
 */
function findBus(codBus){
	var pos = 0;
	var found = false;
	while(pos < autobuses.length && !found){
		if(autobuses[pos].codBus === codBus){
			found = true;
		}else{
			pos++;
		}
	}
	if(pos >= autobuses.length){
		return null;
	}else{
		return pos;
	}
}

/**
 * Busca la posición de ua parada dentro de paradas[]
 * @param {Number} codPar
 * @returns {Number} Posición en paradas[]
 */
function findParada(codPar){
	var pos = 0;
	var found = false;
	while(pos < paradas.length && !found){
		if(paradas[pos].codPar === codPar){
			found = true;
		}else{
			pos++;
		}
	}
	if(pos >= paradas.length){
		return null;
	}else{
		return pos;
	}
}

/**
 * @description Calcula la distancia total de un trazado indicado
 * @param {linea.trazado} trazado
 * @returns {Float}
 */
function distanciaTrazado(trazado){
	var total = 0;
	for(var pos = 1; pos < trazado.getLatLngs().length; pos++){
		total = total + map.distance(trazado.getLatLngs()[pos-1], trazado.getLatLngs()[pos]);
	}
	return total;
}

function extrarCorrespondencias(div, codPar, codLinea){
	$(div).css("max-width", "73px");
	var parada = paradas[findParada(codPar)];
	var cont = 0;
	for(var a = 0; a < parada.servicios.length; a++){
		var servicio = parada.servicios[a].codLinea;
		if(servicio !== codLinea){
			var linea = lineas_emt[findLinea(servicio)];
			var spanIcon = lineaIcon(linea.userCodLinea, "2x", linea.codLinea);
			$(div).append(spanIcon);
		}
	}
	return div;
}

function acortarParada(nombre){
	return nombre.replace(/\s-\s/, "<br>");
}

function lineaIcon(userCodLinea, zoom, codLinea){
	var id = $('<span>').addClass('fa-layers fa-'+zoom);
	if(/^C[1-9]$|^29$/.test(userCodLinea)){ // Circulares
		id.append($('<i>').addClass('fas fa-circle').css("color", "F77F00"));
	}else if(/^N[1-9]/.test(userCodLinea)){ // Nocturno
		id.append($('<i>').addClass('fas fa-circle').css("color", "04151F"));
	}else if(/^A$|^E$|^L$/.test(userCodLinea)){ // Lineas Exprés y Lanzaderas
		id.append($('<i>').addClass('fas fa-circle').css("color", "AA1155"));
	}else if(/^91$|^92$/.test(userCodLinea)){ // Servicios Turísticos
		id.append($('<i>').addClass('fas fa-circle').css("color", "62A87C"));
	}else if(/^12$|^16$|^26$|^64$|^[A-Z]/.test(userCodLinea)){ // Servicios Especiales
		id.append($('<i>').addClass('fas fa-circle').css("color", "D62828"));
	}else{ // Líneas Convencionales
		id.append($('<i>').addClass('fas fa-circle').css("color", "262C72"));
	}
	if(userCodLinea.length < 3){
		id.append($('<span>').addClass("fa-layers-text fa-inverse").text(userCodLinea).attr("data-fa-transform", "shrink-6"));
	}else{
		id.append($('<span>').addClass("fa-layers-text fa-inverse").text(userCodLinea).attr("data-fa-transform", "shrink-8"));
	}
	if(codLinea !== undefined && codLinea !== null){
		id.click(function(){verInfoLinea(codLinea);});
	}
	return id;
}

/**
 * Devuelve el contenido HTML de una ventana de información adicional de autobús
 * @param {Bus} Bus
 * @returns {String}
 */
function busPopupContent(Bus){
	var linea = lineas_emt[findLinea(Bus.codLinea)];
	var sentido;
	switch(Bus.sentido){
		case 1: // Ida
			sentido = linea.cabeceraVta;
			break;
		case 2: // Vuelta
			sentido = linea.cabeceraIda;
			break;
		default:
			sentido = "¿? Desconocido ¿?";
	}
	return "Bus: "+Bus.codBus+"<br>"+
	"Línea: "+linea.userCodLinea+"<br>"+
	"Última parada realizada: "+Bus.codParIni+"<br>"+
	"Sentido: "+sentido;
}

function paradaPopupContent(id){
	var div = $("<div>");
	var parada = paradas[findParada(id)];
	$(div).append($("<h3>", {text: "Parada "+parada.codPar}).css("text-align", "center"));
	$(div).append($("<h4>", {text: parada.nombreParada}).css("text-align", "center"));
	var tabla = $("<table>");
	/*var cabecera = $("<tr>");
	$(cabecera).append($("<th>", {text: "Servicios"}).attr("colspan", /*3 2));
	$(tabla).append(cabecera);*/
	for(var a = 0; a < parada.servicios.length; a++){
		var linea = lineas_emt[findLinea(parada.servicios[a].codLinea)]
		var sentido;
		switch (parada.servicios[a].sentido){
			case 1:
				if(linea.cabeceraVta !== null){
					sentido = linea.cabeceraVta;
				}else{
					sentido = linea.cabeceraIda;
				}
				break;
			case 2:
				sentido = linea.cabeceraIda;
				break;
			default:
				sentido = "-";
				break;
		}
		var fila = $("<tr>");
		$(fila).append($("<td>", {html: lineaIcon(linea.userCodLinea, "2x", linea.codLinea)}));
		$(fila).append($("<td>", {text: sentido}));
		//fila.append($("<td>", {text: "??? min."}).css("text-align", "right"));
		$(tabla).append(fila);
	}
	$(div).append(tabla);
	return $(div).html();
}

function busIconContent(Bus, estado){
	var linea = lineas_emt[findLinea(Bus.codLinea)].userCodLinea;
	var html = linea+"<br>"+Bus.codBus;
	var clase;
	switch (Bus.sentido){
		case 1:
			clase = 'marker ida';
			break;
		case 2:
			clase = 'marker vta';
			break;
		default:
			clase = 'marker desconocido';
			break;
	}
	switch (estado){
		case 1:
			clase += ' bus-new';
			break;
		case 2:
			clase += ' bus-lost';
			break;
		default:
			clase += ' bus-normal';
			break;
	}
	return L.divIcon({
		className: clase,
		iconSize: [32, 30],
		iconAnchor: [0, 0],
		popupAnchor: [16, 0],
		html: html
	});
}

function paradaIconContent(codPar){
	return L.divIcon({
		className: 'marker parada',
		iconSize: [36, 15],
		iconAnchor: [18, 7],
		popupAnchor: [0, -7],
		html: codPar
	});
}

/**
 * Recoge un elemento del DOM y lo devuelve rellenado con el HTML adecuado de la barra de control
 * @param {DOM Element} mapDiv
 * @returns {DOM Element}
 */
function ControlRUTPAM(mapDiv){
	var titulo = $("<h2>", {"text":"RUTPAM"});
	var descripcion = $("<p>", {"text":"Seguimiento buses EMT en tiempo real"});
	$(mapDiv).append(titulo).append(descripcion);
	
	var obtenerLineas = $("<button>", {
		"id": "getLineas",
		"type": "button",
		"class": "boton",
		"text": "Obtener líneas"
	});
	obtenerLineas.on("click", getLineas);
	var play = $("<button>", {
		"id": "play",
		"type": "button",
		"class": "boton",
		"text": "Play"
	});
	play.on("click", function(){
		start();
	});
	play.css("display", "none");
	var refresh = $("<button>", {
		"id": "refresh",
		"type": "button",
		"class": "boton",
		"text": "Refrescar"
	});
	refresh.on("click", function(){
		motor();
	});
	refresh.css("display", "none");
	var pause = $("<button>", {
		"id": "pause",
		"type": "button",
		"class": "boton",
		"text": "Pausa"
	});
	pause.on("click", function(){
		stop();
	});
	pause.css("display", "none");
	$(mapDiv).append(obtenerLineas).append(play).append(refresh).append(pause);
	var tabla = $("<table>", {
		"id": "tablaLineas"
	});
	var encabezado = $("<tr>");
	$(encabezado).html('<th>Ida</th><th>Vta</th><th>Bus</th><th colspan="2">Línea</th><th>NºB.</th>');
	$(tabla).append(encabezado);
	
	$(mapDiv).append(tabla);
	$(mapDiv).append('<br><small><a href="#!" onclick="verCopyright()">Acerca de RUTPAM</a></small>')
	return mapDiv;
}

function verCopyright(){
	var rutpam_credits = 'R.U.T.P.A.M. v'+rutpam_version+'<br>\n\
	Licencia MIT © Néstor M. Lora - 2018<br>\n\
	<a href="mailto:nestorlora@geeklab.es">nestorlora@geeklab.es</a><br><br>\n\
	Datos cartográficos: <i class="fab fa-creative-commons"></i><i class="fab fa-creative-commons-by"></i><i class="fab fa-creative-commons-sa"></i> Colaboradores de <a href="https://openstreetmap.org">OpenStreetMap</a><br>\n\
	Información de líneas: Empresa Malagueña de Transportes S.A.M.<br><br>\n\
	Construido con <i title="HTML 5" class="fab fa-html5 fa-2x fa-fw" style="color: orangered"></i> \n\
	<i title="CSS 3" class="fab fa-css3-alt fa-2x fa-fw" style="color: dodgerblue"></i> \n\
	<span title="JavaScript" class="fa-2x fa-layers fa-fw">\n\
	<i class="fas fa-square" style="color: black"></i>\n\
	<i class="fab fa-js" style="color: yellow"></i>\n\
	</span>\n\
	jQuery <a href="http://leafletjs.com" title="A JS library for interactive maps">Leaflet</a> \n\
	<i title="Font Awesome" class="fab fa-font-awesome fa-2x fa-fw" style="color: dodgerblue"></i><br>\n\
	Consulta el repositorio en <a href="https://github.com/nestorlora/RUTPAM">Github<i class="fab fa-github fa-fw" style="color: indigo"></i></a>';
	$("#ventana").hide();
	$("#infoContent").empty();
	$("#infoContent").append($("<h3>", {text: "Información"}).css("text-align", "center"));
	$("#infoContent").append($("<p>", {html: rutpam_credits}).css("text-align", "center"));
	$("#ventana").show();
}

function closeInfo(){
	$("#ventana").hide();
}