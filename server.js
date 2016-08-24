"use strict";

let TelegramBot = require('node-telegram-bot-api');
let request = require("request");

let token = require("./pass.js").token;
let bot = new TelegramBot(token, {polling: true});

let userData = {};

let sendRequest = (fromId, paradero) => {
	//Using adderou API
	let url = "http://dev.adderou.cl/transanpbl/busdata.php?paradero="+paradero;

	request(url, (err,resp,body) => {
		let data = JSON.parse(body);
		var builder = "Consulta Paradero: "+paradero+" 🚌\n";
		if(data.servicios.length == 0){
			builder += "Sin información";
		}
		else{
			let serv = data.servicios;
			for(var i=0; i<serv.length; i++){
				if(serv[i].tiempo!=null)
					builder += serv[i].servicio+" - "+serv[i].tiempo+" ("+serv[i].distancia+")"+"\n";
			}
		}
		bot.sendMessage(fromId, builder);
	});
};

let saveRecent = (fromid, paradero) => {
	if(userData[fromid] == null || userData[fromid].recent == null){
		userData[fromid] = {query: false, recent: []};
	}
	if(userData[fromid].recent.indexOf(paradero) == -1){
		if(userData[fromid].recent.length >= 3){
			userData[fromid].recent.splice(0,1);
		}
		userData[fromid].recent.push(paradero);
	}
};



bot.onText(/\/consulta (.+)/, (msg, match) => {
	let fromId = msg.from.id;
	let paradero = match[1];
	sendRequest(fromId,paradero)
	saveRecent(fromId,paradero);
});


bot.onText(/^\/consulta$/, (msg, match) => {
	let fromId = msg.from.id;
	if(userData[fromId]==null)
		userData[fromId] = {};
	userData[fromId].query = true;
	if(userData[fromId].recent != null && userData[fromId].recent.length > 0){
		bot.sendMessage(fromId, "Indica el nombre del Paradero",{
			"reply_markup": {
				"keyboard": [userData[fromId].recent],
				"one_time_keyboard": true
			}
		});
	}
	else{
		userData[fromId].recent = [];
		bot.sendMessage(fromId, "Indica el nombre del Paradero");
	}
});

bot.onText(/^P[a-zA-Z][0-9]{3,4}$/, (msg, match) => {
	var fromId = msg.from.id;
	if(userData[fromId]!=null && userData[fromId].query){
		sendRequest(fromId,match[0]);
		userData[fromId].query = false;
		saveRecent(fromId,match[0]);
	}
});