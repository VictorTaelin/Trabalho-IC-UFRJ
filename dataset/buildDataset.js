var fs = require("fs");
var pokes = require("./../pokes.json");

function player(p){
  var sum = (a) => a.reduce(function(a,b){return a+b}, 0);
  var poke = pokes[p.specie];
  //function s(s){
    //return s[0] ? 2 : s[1] ? 1 : s[2] ? 3 : s[3] ? 5 : s[4] ? 4 : 0;
  //};
  if (!poke)
    console.log(p.specie,poke);
  return [
    p.elo,
    p.hp,
    poke.stats.hp,
    poke.stats.atk,
    poke.stats.def,
    poke.stats.spa,
    poke.stats.spd,
    poke.stats.spe,
    poke.usage.casual,
    Math.max(Math.min(sum(p.boost), 6), -6),
    Math.min(sum(p.status), 1),
    sum(p.party)];
};

var rows = [];
fs.readdirSync("sits").map((file)=>{
  JSON.parse(fs.readFileSync("sits/"+file, "utf8")).map(function(sit){
    rows.push(
      [].concat.call(
        [sit.turn],
        player(sit.players[0]),
        player(sit.players[1]),
        Number(sit.players[1].move === "switch")),
      [].concat.call(
        [sit.turn],
        player(sit.players[1]),
        player(sit.players[0]),
        Number(sit.players[0].move === "switch")));
  });
});

var vars = [
  "turn",
  "a_elo",
  "a_health",
  "a_hp",
  "a_atk",
  "a_def",
  "a_spa",
  "a_spd",
  "a_spe",
  "a_usage",
  "a_boost",
  "a_status",
  "a_party",
  "b_elo",
  "b_health",
  "b_hp",
  "b_atk",
  "b_def",
  "b_spa",
  "b_spd",
  "b_spe",
  "b_usage",
  "b_boost",
  "b_status",
  "b_party",
  "switch"];

var file = [vars].concat(rows).map(function(row){
  return row.join(",");
}).join("\n");

fs.writeFileSync("./../dataset.csv", file);

//var example = {
  //"turn": 0,
  //"players": [
    //{
      //"party": [1, 1, 1, 1, 1, 1],
      //"move": "scald",
      //"specie": "Slowbro",
      //"hp": 1,
      //"boost": [0, 0, 0, 0, 0],
      //"status": [0, 0, 0, 0, 0],
      //"active": 1,
      //"wins": 0,
      //"elo": 1288
    //},
    //{
      //"party": [1, 1, 1, 1, 1, 1],
      //"move": "leechseed",
      //"specie": "Ferrothorn",
      //"hp": 1,
      //"boost": [0, 0, 0, 0, 0],
      //"status": [0, 0, 0, 0, 0],
      //"active": 1,
      //"wins": 0,
      //"elo": 1618
    //}
  //]
//}

