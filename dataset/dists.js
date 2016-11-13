var fs = require("fs");
var df = fs.readFileSync("./norm_dataset.csv", "utf8");

df = df.split("\n").slice(1,-1).map(function(line){
  return line.split(",").slice(1).map(Number);
});

var dists = [];
for (var j=0, l=df.length; j<l; ++j){
  var a = df[j];
  var ds = 0;
  for (var i=0; i<l; ++i){
    var b = df[i];
    var d = 0;
    for (var k=0, K=b.length; k<K; ++k)
      d += (a[k]-b[k])*(a[k]-b[k]);
    ds += Math.sqrt(d);
  };
  if (j%100 === 0) console.log(j, ds/l);
  dists.push([j,ds/l]); 
};

dists = dists.sort(function(a,b){ return a[1] - b[1]; });
fs.writeFileSync("dists.csv",dists.map(function(a){return a[0]+","+a[1]}).join("\n"))


