<?php

/*
 * The MIT License
 *
 * Copyright 2018 Nestor Manuel Lora Romero <nestorlora@gmail.com>.
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
?>
<head>
    <title>RUTPAM Tiempo Real</title>
	<script src="https://code.jquery.com/jquery-3.3.1.min.js" integrity="sha256-FgpCb/KJQlLNfOu91ta32o/NMZxltwRo8QtmkMRdAu8=" crossorigin="anonymous"></script>
    <meta name="viewport" content="initial-scale=1.0">
    <meta charset="utf-8">
    <style>
	/* Makes the sample page fill the window. */
	html, body {
		height: 100%;
		margin: 0;
		padding: 0;
		font-family: 'Roboto', sans-serif;
	}
	table{
		font-size: 11px;
	}
	p{
		margin: 3px;
	}
	#map {
		height: 100%;
	}
	#over_map {
		position: absolute;
		top: 10px;
		left: 10px;
		z-index: 99;
		
		background-color: white;
		padding: 5px;
		overflow-y: auto;
		max-height: 90%;
	}
	.boton{
		background-color: white;
		border: 1px solid lightgray;
		padding: 3px;
	}
	.scroll{
		
	}
    </style>
</head>
<body>
<div id="wrapper">
	<div id="map">Aquí debería ir el mapa</div>
	<div id="over_map">
		<span class="padding">
			<b>RUTPAM</b> Seguimiento buses EMT en tiempo real
		</span>
	</div>
</div>
<script>
var url_white_icon = '<?= base_url('/assets/white_bus.png') ?>';
var url_red_icon = '<?=  base_url('/assets/red_bus.png') ?>';
var url_orange_icon = '<?= base_url('/assets/orange_bus.png')?>';
var emt_proxy_url = '<?= ($this->config->item('proxy_url'))!=null?$this->config->item('proxy_url').'/emt-core':site_url('/proxy/emt-core') ?>';
var refresh_rate = <?= $this->config->item('proxy_url')!=null?1:3 ?>;
var ttl_rate_default = 60;
var ttl_rate_new = ttl_rate_default+30;
var ttl_rate_old = ttl_rate_default-15;
</script>
<script src="<?=base_url('/assets/realTimeMapaUbicaciones.js')?>"></script>
<script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyCPD4goi4Rqi6ZfeoaMyD_7LNYoW7fXn2A&callback=initMap"
async defer></script>
</body>
