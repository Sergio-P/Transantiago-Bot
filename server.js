"use strict";

let TelegramBot = require('node-telegram-bot-api');
let request = require("request");
let fs = require("fs");

let token = require("./pass.js").token;
let bot = new TelegramBot(token, {polling: true});

let userData = JSON.parse(fs.readFileSync("user_data.json"));

const SAVE_USER_DATA = true;

let sendRequest = (fromId, paradero) => {
	let servs;
	if(paradero.indexOf(" ")!=-1){
		let comps = paradero.split(" ");
		servs = comps.slice(1);
		paradero = comps[0];
	}

	//Using adderou API
	let url = "https://api.adderou.cl/ts/?paradero="+paradero;
	if(servs != null && servs.length > 0)
		url += "&servicios="+servs.join(",");

	request(url, (err,resp,body) => {
		try{
			let data = JSON.parse(body);
			var builder = "Consulta Paradero: /" + paradero.toUpperCase() + " 🚌\n";
			if(data.servicios.length == 0){
				builder += "Sin información";
			}
			else{
				let serv = data.servicios;
				for(var i=0; i<serv.length; i++){
					if(serv[i].tiempo!=null)
						builder += "*"+serv[i].servicio+"* - "+serv[i].tiempo+" ("+(serv[i].distancia.match(/\d+/)[0])+"m)"+"\n";
				}
			}
			bot.sendMessage(fromId, builder, {parse_mode: "Markdown"});
		}
		catch(err) {
			bot.sendMessage(fromId, "Error al cargar datos de Transantiago 💤");
		}
	});
};

let saveRecent = (fromid, paradero) => {
	if(userData[fromid] == null || userData[fromid].recent == null){
		userData[fromid] = {recent: []};
	}
	if(userData[fromid].recent.indexOf(paradero) == -1){
		userData[fromid].recent.push(paradero);
		if(SAVE_USER_DATA){
			fs.writeFile("user_data.json", JSON.stringify(userData), (err) => {
  				if (err) throw err;
  			});
		}
	}
};


let removeRecent = (fromid, paradero) => {
	if(userData[fromid] == null || userData[fromid].recent == null){
		return;
	}
	let ind = userData[fromid].recent.indexOf(paradero);
	if(ind != -1){
		userData[fromid].recent.splice(ind,1);
		if(SAVE_USER_DATA){
			fs.writeFile("user_data.json", JSON.stringify(userData), (err) => {
  				if (err) throw err;
  			});
		}
	}
};

let getKeyboard = (fromId) => {
	let favs = userData[fromId].recent;
	let rows = ~~(Math.sqrt(favs.length));
	let cols = favs.length / rows;
	let keyboard = [];
	let k = 0;
	for(var j = 0; j < rows; j++){
		keyboard.push([]);
		for(i = 0; i < cols; i++){
			if(k >= favs.length) break;
			keyboard[j].push(favs[k]);
			k++;
		}
	}
	return keyboard;
};

bot.onText(/\/consulta (.+)/, (msg, match) => {
	let fromId = msg.from.id;
	let paradero = match[1];
	sendRequest(fromId,paradero);
	//saveRecent(fromId,paradero);
});

bot.onText(/\/favorito (.+)/, (msg, match) => {
	let fromId = msg.from.id;
	let paradero = match[1];
	//sendRequest(fromId,paradero)
	saveRecent(fromId,paradero);
	bot.sendMessage(fromId,"Paradero guardado a favoritos",{
		"reply_markup": {
			"keyboard": getKeyboard(fromId),
			"one_time_keyboard": true
		}
	});
});

bot.onText(/\/borrarfavorito (.+)/, (msg, match) => {
	let fromId = msg.from.id;
	let paradero = match[1];
	//sendRequest(fromId,paradero)
	removeRecent(fromId,paradero);
	bot.sendMessage(fromId,"Paradero removido de favoritos, actualiza tu teclado usando /consulta o cuando agregues un nuevo favorito");
});


bot.onText(/^\/consulta$/, (msg, match) => {
	let fromId = msg.from.id;
	if(userData[fromId]==null)
		userData[fromId] = {};
	if(userData[fromId].recent != null && userData[fromId].recent.length > 0){
		bot.sendMessage(fromId, "Indica el nombre del Paradero",{
			"reply_markup": {
				"keyboard": getKeyboard(fromId),
				"one_time_keyboard": true
			}
		});
	}
	else{
		userData[fromId].recent = [];
		bot.sendMessage(fromId, "Indica el nombre del Paradero");
	}
});

bot.onText(/^\/?[P,p][a-zA-Z][0-9]{2,4}$/, (msg, match) => {
	var fromId = msg.from.id;
	if(userData[fromId]!=null){
		sendRequest(fromId,match[0].replace("/",""));
		//saveRecent(fromId,match[0]);
	}
});