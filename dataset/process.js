var fs = require("fs");
var pokes = require("./../pokes.json");

// Gets a bulk HTML file downloaded from replay.pokemonshowdown.com,
// parses the log, returns a list of actions (switch, damage, etc).
function actions(file){
  var beginMark = '<script type="text/plain" class="battle-log-data">';
  var beginMark2 = '<script type="text/plain" class="log">';
  var endMark = '</script>';
  var begin = file.indexOf(beginMark);
  if (begin === -1) begin = file.indexOf(beginMark2);
  var end = file.indexOf(endMark, begin);
  if (begin !== -1){
    var log = file.slice(begin + beginMark.length, end);
    var actions = log
      .split("\n")
      .map(function(line){
        return line.split("|").filter(function(word){
          return word !== "";
        });
      })
      .filter(function(line){
        return line.length > 0;
      });
  };
  return actions;
};

// Gets a list of actions, returns every turn's state.
function states(actions){
  var state = {
    pokes: {},
    turn: 0
  };
  var states = [];
  var turned = 0;
  var sentPokes = [0, 0];
  for (var i=0; i<actions.length; ++i){
    var act = actions[i];
    switch (act[0]){
      case "start":
      case "turn":
        turned = 1;
      break;
      case "choice":
        if (turned){
          turned = 0;
          state.next = act.slice(1);
          states.push(JSON.parse(JSON.stringify(state)));
          ++state.turn;
          for (var n in state.pokes)
            if (state.pokes[n].active)
              ++state.pokes[n].active;
        };
      break;
      case "switch":
        var name = act[1];
        if (!state.pokes[name]){
          var player = name.slice(0,2) === "p1" ? 0 : 1;
          var specie = act[2];
          if (specie.indexOf(",") !== -1)
            specie = specie.slice(0, specie.indexOf(","));
          state.pokes[name] = {
            specie: specie,
            hp: act[3],
            boost: {
              hp: 0,
              atk: 0,
              def: 0,
              spa: 0,
              spd: 0,
              spe: 0
            },
            status: {
              brn: 0,
              psn: 0,
              par: 0,
              frz: 0,
              slp: 0
            },
            mega: 0,
            active: 0,
            player: player,
            partyNum: sentPokes[player]++,
          };
        };
        var p = name.slice(0,2);
        for (var n in state.pokes){
          if (n.slice(0,2) === p){
            state.pokes[n].active = 0;
            for (var key in state.pokes[n].boost)
              state.pokes[n].boost[key] = 0;
          };
        };
        state.pokes[name].active = 1;
      break;
      case "-damage":
      case "-heal":
        state.pokes[act[1]].hp = act[2];
      break;
      case "-boost":
        state.pokes[act[1]].boost[act[2]] += Number(act[3]);
      break;
      case "-unboost":
        state.pokes[act[1]].boost[act[2]] -= Number(act[3]);
      break;
      case "-setboost":
        state.pokes[act[1]].boost[act[2]] = Number(act[3]);
      break;
      case "-mega":
        state.pokes[act[1]].mega = 1;
      break;
      case "-status":
        state.pokes[act[1]].status[act[2]] = 1;
      break;
      case "-curestatus":
        state.pokes[act[1]].status[act[2]] = 0;
      break;
    };
  };
  states.push(JSON.parse(JSON.stringify(state)));
  return states;
};

function situations(states){
  function hp(str){
    if (str === "0 fnt") return 0;
    var a = str.slice(0, str.indexOf("\\"));
    var b = str.slice(str.indexOf("/")+1);
    return Number(a) / Number(b);
  };
  function entry(player){
    return [].concat.call(
      [player.specie],
      [player.active],
      [player.hp],
      player.boost,
      player.status,
      player.party);
  };
  var situations = [];
  for (var i=0, l=states.length; i<l; ++i){
    var state = states[i];
    var players = [
      {party: [1,1,1,1,1,1]},
      {party: [1,1,1,1,1,1]}
    ];
    for (var p=0; p<2; ++p)
      players[p].switches = state.next[p].indexOf("switch") !== -1 ? 1 : 0;
    for (var p in state.pokes){
      var poke = state.pokes[p];
      var player = players[poke.player];
      if (poke.active){
        player.specie = poke.specie;
        player.hp = hp(poke.hp);
        player.boost = [poke.boost.atk, poke.boost.def, poke.boost.spa, poke.boost.spd, poke.boost.spe];
        player.stats = poke
        player.status = [poke.status.brn, poke.status.psn, poke.status.par, poke.status.frz, poke.status.slp];
        player.active = poke.active;
      };
      player.party[poke.partyNum] = hp(poke.hp);
    };
    situations.push(players);
  };
  console.log(situations);
};

var file = fs.readFileSync("log0.html", "utf8");

var sts = states(actions(file));
var sis = situations(sts);

//fs.writeFileSync("test.json", JSON.stringify(aa, null, 2));

