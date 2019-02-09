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

/* Este archivo forma parte de R.U.T.P.A.M. no funcionará por separado */

/* global emt_proxy_url, betteremt_api_url, odm_api_url, ttl_new, default_ttl, refresh_rate, L, map, lineasCargadas, lineas, paradas, autobuses */

/**
 * @description Función que llama a la API para cargar las líneas. Cambia algunos elementos para preparar la interfaz.
 * @returns {null}
 */
function getLineasEmt(){
	//$("#getLineas").remove(); // Eliminamos el botón para pedir las líneas
	// Petición AJAX
	$.getJSON({
		url: emt_proxy_url+'/services/lineas/'
	}).done(function (response, status){
		if(status === "success"){
			for(var i = 0; i<response.length; i++){
				addLineaEmt(response[i]); // Para cada línea de la respuesta la pasamos por addLinea()
				lineasCargadas++;
			}
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
 * @param {Int} idLinea
 * @returns {null}
 */
function getTrazadosEmt(idLinea){
	// Cambiamos el estado a deshabilitado a la espera de recibir los datos
	$("#botonIda"+idLinea).prop("indeterminate", false).prop("disabled", true).off('click');
	$("#botonVta"+idLinea).prop("indeterminate", false).prop("disabled", true).off('click');
	// Llamada AJAX Ida
	$.getJSON({
		url: emt_proxy_url+'/services/trazados/?codLinea='+codLinea(idLinea)+'&sentido=1'
	}).done(function (response, status){
		if(status === "success" && response.length > 0){
			var posLinea = findLinea(idLinea); // Almacenamos la posición en lineas[] para uso más cómodo
			var trazado = []; // Creamos un array con los puntos de latitud y longitud del polígono
			for(var a = 0; a < response.length; a++){
				trazado.push({lat: response[a].latitud, lng: response[a].longitud});  // Rellenamos con los datos de la respuesta
			}
			lineas[posLinea].trazadoIda = L.polyline(trazado, {
				color: colores.emtA, // Fijamos el color de la ida
				opacity: 1.0, // Opacidad
				weight: 3 // Grosor
			});
			lineas[posLinea].getIda = true;
			$("#botonIda"+idLinea).prop("disabled", false); 
			$("#botonIda"+idLinea).change(function(){
				var isChecked = $(this).is(':checked');
				if(isChecked){
					showTrazado(idLinea, 1); // Mostramos el trazado
				}else{
					hideTrazado(idLinea, 1); // Ocultamos el trazado
				}
			});
			$("#botonIda"+idLinea).trigger("change");
		}
	});
	// Llamada AJAX Vuelta
	$.getJSON({
		url: emt_proxy_url+'/services/trazados/?codLinea='+codLinea(idLinea)+'&sentido=2'
	}).done(function (response, status){
		if(status === "success" && response.length > 0){
			var posLinea = findLinea(idLinea); // Almacenamos la posición en lineas[] para uso más cómodo
			var trazado = []; // Creamos un array con los puntos de latitud y longitud del polígono
			for(var a = 0; a < response.length; a++){
				trazado.push({lat: response[a].latitud, lng: response[a].longitud}); // Rellenamos con los datos de la respuesta
			}
			lineas[posLinea].trazadoVta = L.polyline(trazado, {
				color: colores.emtB, // Fijamos el color de la vuelta
				opacity: 1.0, // Opacidad
				weight: 3 // Grosor
			});
			lineas[posLinea].getVta = true;
			$("#botonVta"+idLinea).prop("disabled", false);
			$("#botonVta"+idLinea).change(function(){
				var isChecked = $(this).is(':checked');
				if(isChecked){
					showTrazado(idLinea, 2); // Mostramos el trazado
				}else{
					hideTrazado(idLinea, 2); // Ocultamos el trazado
				}
			});
			$("#botonVta"+idLinea).trigger("change");
		}		
	});
	return null;
}

/**
 * @deprecated
 * @param {String} idLinea 
 */
function getUbicacionesEmt(idLinea){
	$.getJSON({
		//url: emt_proxy_url+'/services/buses/?codLinea='+codLinea
		url: betteremt_api_url+'/buses/linea/'+codLinea(idLinea)
	}).done(function (response, status){
		if(status === "success"){
			for(var x = 0; x < response.length; x++){
                pos = findBus(response[x].codBus);
                response[x].idLinea = "EMT-"+response[x].codLinea;
				if(pos !== null){
					updateBusEmt(response[x], pos);
				}else{
					addBusEmt(response[x]);
				}
			}
			lineas[findLinea(idLinea)].numBuses = response.length;
			$("#cont"+idLinea).text(response.length);
		}		
	});
};

function getBusesEmt(){
	$.getJSON({
		//url: betteremt_api_url+'/buses/all'
		url: odm_api_url+'datastore_search_sql?sql=SELECT * from "9bc05288-1c11-4eec-8792-d74b679c8fcf" WHERE last_update=(SELECT MAX(last_update) from "9bc05288-1c11-4eec-8792-d74b679c8fcf")'
	}).done(function (response, status){
		if(status === "success"){
			/* Limpieza Open Data Málaga */
			response = response.result.records;
			for(var x = 0; x < response.length; x++){
				response[x].codBus = Number(response[x].codBus);
				response[x].codLinea = Number(response[x].codLinea);
				response[x].codParIni = Number(response[x].codParIni);
				response[x].latitud = Number(response[x].lat);
				response[x].longitud = Number(response[x].lon);
				response[x].sentido = Number(response[x].sentido);
			}
			/* Procesado de ubicaciones con normalidad */
			for(var x = 0; x < response.length; x++){
                pos = findBus(response[x].codBus);
                response[x].idLinea = "EMT-"+response[x].codLinea;
				 response[x].codParIni = "EMT-"+response[x].codParIni;
				if(pos !== null){
					updateBusEmt(response[x], pos);
				}else{
					addBusEmt(response[x]);
				}
			}
		}		
	});
}

function addBusEmt(Bus){
	console.log("ADDED "+Bus.codBus);
    var coordenadas = {lat: Bus.latitud , lng: Bus.longitud};
	var data = {
		marker: L.marker(coordenadas, {
			icon: busIconContent(Bus, 1)
		}),
		popup: L.popup({autoPan: false, autoClose: false}).setContent(busPopupContent(Bus)),
		codBus: Bus.codBus,
		idLinea: Bus.idLinea,
		sentido: Bus.sentido,
		codParIni: Bus.codParIni,
		latitud: Bus.latitud,
		longitud: Bus.longitud,
		ttl: ttl_new
	};
	var pos = autobuses.push(data)-1;
	autobuses[pos].marker.bindPopup(autobuses[pos].popup);
	var poslinea = findLinea(Bus.idLinea);
	if(lineas[poslinea].getBuses){
		autobuses[pos].marker.addTo(map);
	}
	lineas[poslinea].numBuses++;
}

function updateBusEmt(Bus, pos){
	var coordenadas = {lat: Bus.latitud , lng: Bus.longitud};
	if(!autobuses[pos].marker.getLatLng().equals(coordenadas)){
		autobuses[pos].marker.setLatLng(coordenadas);
	}
	autobuses[pos].idLinea = Bus.idLinea;
	autobuses[pos].sentido = Bus.sentido;
	autobuses[pos].codParIni = Bus.codParIni;
	autobuses[pos].latitud = Bus.latitud;
	autobuses[pos].longitud = Bus.longitud;
	autobuses[pos].popup.setContent(busPopupContent(Bus));
	if(lineas[findLinea(Bus.idLinea)].getBuses){
		autobuses[pos].marker.addTo(map);
	}
	if(autobuses[pos].ttl < default_ttl){
		autobuses[pos].ttl = default_ttl;
		autobuses[pos].marker.setIcon(busIconContent(autobuses[pos], 0));
	}
}

function addLineaEmt(lin){
	var linea = {
        idLinea: "EMT-"+lin.codLinea,
		userCodLinea: lin.userCodLinea.replace(/^F-/, "F"),
		nombreLinea: lin.nombreLinea.replace(/(\(F\))|(\(?F-[0-9A-Z]{1,2}\)$)/, ""),
		cabeceraIda: lin.cabeceraIda, 
		cabeceraVta: lin.cabeceraVuelta,
		paradasIda: [],
        paradasVta: [],
        trazadoIda: null,
        trazadoVta: null,
        getBuses: false,
		getIda: false,
		getVta: false,
		verParadas: false,
        numBuses: 0,
        modo: "Autobús",
        hayNoticia: null,
        operadores: "Empresa Malagueña de Transportes S.A.M.",
		tieneIda: null,
		tieneVuelta: null
	};
	for(var a = 0; a < lin.paradas.length; a++){
		addParadaEmt(lin.paradas[a].parada, linea.idLinea, lin.paradas[a].sentido);
		if(lin.paradas[a].sentido === 1){
			linea.paradasIda.push({
				codPar: "EMT-"+lin.paradas[a].parada.codParada,
				orden: lin.paradas[a].orden
			});
		}
		if(lin.paradas[a].sentido === 2){
			linea.paradasVta.push({
				codPar: "EMT-"+lin.paradas[a].parada.codParada,
				orden: lin.paradas[a].orden
			});
		}
	}
	if(linea.paradasIda.length > 1){
		linea.tieneIda = true;
	}
	if(linea.paradasVta.length > 1){
		linea.tieneVuelta = true;
	}else{
		linea.cabeceraIda = "Circular";
		linea.cabeceraVta = "Circular";
	}
	// Corrección en paradas
	if(linea.tieneIda){
		var maxIda = linea.paradasIda.length;
		for(var x = 0; x < linea.paradasVta.length; x++){
			linea.paradasVta[x].orden -= maxIda;
		}
		if(linea.tieneVuelta){
			linea.paradasIda.push({
				codPar: linea.paradasVta[0].codPar,
				orden: -1
			});
			linea.paradasVta.push({
				codPar: linea.paradasIda[0].codPar,
				orden: -1
			});
		}
	}
	lineas.push(linea);
	//getTrazados(linea.idLinea);
	
	var fila = $("<tr>");
	var botonIda = $("<input>", {
		"type": "checkbox",
		"id": "botonIda"+linea.idLinea
	}).prop('checked', false).prop("indeterminate", true).click(function(){
		getTrazadosEmt(linea.idLinea);
	});
	var botonVta = $("<input>", {
		"type": "checkbox",
		"id": "botonVta"+linea.idLinea,
		"checked": true
	}).prop('checked', false).prop("indeterminate", true).click(function(){
		getTrazadosEmt(linea.idLinea);
	});
	var botonBus = $("<input>", {
		"type": "checkbox",
		"id": "botonBus"+linea.idLinea
	}).prop('checked', false).click(function(){
		enableBusUpdate(linea.idLinea);
	});
	$(fila).append($("<td>").append(botonIda));
	$(fila).append($("<td>").append(botonVta));
	$(fila).append($("<td>").append(botonBus));
	$(fila).append($("<td>").append(lineaIcon(linea.userCodLinea, "3x")));
	$(fila).append($("<td>").append($("<a>", {text: linea.nombreLinea, href: "#!"}).click(function(){verInfoLinea(linea.idLinea);})));
	$(fila).append($("<td>").append($("<p>").attr('id', "cont"+linea.idLinea)));

	$("#tablaLineasEMT").append(fila);
}

function addParadaEmt(parada, idLinea, sentido){
	var pos = findParada("EMT-"+parada.codParada);
	if(pos !== null){
		paradas[pos].servicios.push({
			idLinea: idLinea,
			sentido: sentido,
			espera: null
		});
	}else{
		pos = paradas.push({
			codPar: "EMT-"+parada.codParada,
			nombreParada: parada.nombreParada,
			direccion: parada.direccion,
			idNucleo: 0,
			idZona: "A",
			servicios: [],
			latitud: parada.latitud,
			longitud: parada.longitud,
			modos: "Autobús",
			marker: null,
			popup: null,
			viewCont: 0
		})-1;
		paradas[pos].servicios.push({
			idLinea: idLinea,
			sentido: sentido,
			espera: null
		});
	}
}

function codLinea(idLinea){
    return idLinea.replace(/^EMT-/, "");
}