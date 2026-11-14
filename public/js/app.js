(function(){
"use strict";
var SRC=[
 {k:"property_tax",l:"Property taxes",c:"#c8ff00",local:1},
 {k:"star",l:"STAR",c:"#00ffd0"},
 {k:"pilots",l:"PILOTs",c:"#7eb0ff",local:1},
 {k:"state_formula",l:"State formula aid",c:"#ff2d6a"},
 {k:"state_other",l:"Other state aid",c:"#ff9ab8"},
 {k:"federal_aid",l:"Federal aid",c:"#3d7eff"},
 {k:"tuition_charges",l:"Tuition & charges",c:"#ff8c00",local:1},
 {k:"interest_earnings",l:"Interest earnings",c:"#c45cff",local:1},
 {k:"other_local",l:"Other local",c:"#8a8a94",local:1}
];
var COLS=[
 {k:"property_tax",l:"Property taxes"},{k:"star",l:"STAR"},{k:"pilots",l:"PILOTs"},
 {k:"state_formula",l:"State formula aid"},{k:"state_other",l:"Other state aid"},{k:"state_aid_total",l:"State aid total",tot:1},
 {k:"federal_aid",l:"Federal aid"},{k:"tuition_charges",l:"Tuition & charges"},{k:"interest_earnings",l:"Interest earnings"},
 {k:"other_local",l:"Other local"},{k:"total_revenue",l:"Total revenue",tot:1},
 {k:"local_share",l:"Local share",pctOnly:1},
 {k:"foundation_aid_2026_27",l:"Foundation Aid 2026-27",ctx:1},
 {k:"approp_fund_balance_2026_27",l:"Approp. fund bal. 2026-27",ctx:1},
 {k:"gf_fund_balance_change",l:"GF balance change 24-25",ctx:1}
];
var colorOf={};SRC.forEach(function(s){colorOf[s.k]=s.c});colorOf.state_aid_total="#ff2d6a";colorOf.total_revenue="#f4f4f0";
var D=[],st={unit:"usd",county:"All",q:"",sort:"total_revenue",dir:-1,mixSort:"local",mixCounty:"All"};
var $=function(id){return document.getElementById(id)};
function money(v){if(v==null)return"n/a";var a=Math.abs(v),s=v<0?"-":"";if(a>=1e9)return s+"$"+(a/1e9).toFixed(2)+"B";if(a>=1e6)return s+"$"+(a/1e6).toFixed(1)+"M";if(a>=1e3)return s+"$"+Math.round(a/1e3)+"K";return s+"$"+Math.round(a)}
function full(v){return v==null?"n/a":(v<0?"-":"")+"$"+Math.round(Math.abs(v)).toLocaleString("en-US")}
function pct(v){return v==null?"n/a":v.toFixed(1)+"%"}
function localOf(r){return r.property_tax+r.pilots+r.tuition_charges+r.interest_earnings+r.other_local}
function agg(rows,name){var o={name:name,enr:0,_n:0};COLS.forEach(function(c){if(!c.pctOnly)o[c.k]=0});
 rows.forEach(function(r){COLS.forEach(function(c){if(!c.pctOnly&&r[c.k]!=null)o[c.k]+=r[c.k]});if(r.enr)o.enr+=r.enr});
 o.local_share=localOf(o)/o.total_revenue*100;return o}
function val(r,c){
 if(c.k==="local_share")return r.local_share;
 var v=r[c.k];if(v==null)return null;
 if(st.unit==="pct")return c.ctx?(c.k==="gf_fund_balance_change"||c.k==="approp_fund_balance_2026_27"?v/r.total_revenue*100:null):v/r.total_revenue*100;
 if(st.unit==="pp")return r.enr?v/r.enr:null;
 return v}
function fmt(r,c){var v=val(r,c);if(v==null)return null;if(c.k==="local_share"||st.unit==="pct")return pct(v);if(st.unit==="pp")return full(v);return money(v)}
function pills(el,opts,cur,cb){el.innerHTML="";opts.forEach(function(o){var b=document.createElement("button");b.className="pill"+(o[0]===cur?" on":"");b.textContent=o[1];b.onclick=function(){cb(o[0])};el.appendChild(b)})}

fetch("data/funding.json").then(function(r){return r.json()}).then(function(j){
 D=j.rows;D.forEach(function(r){r.local_share=localOf(r)/r.total_revenue*100;r.state_pct=r.state_aid_total/r.total_revenue*100});
 hero();findings();mix();table();map();
});

function hero(){var li=agg(D,"LI");
 var s=[[money(li.total_revenue),"Total revenue, 2024-25","h-lime"],[pct(li.property_tax/li.total_revenue*100),"From property taxes","h-lime"],[pct(li.state_aid_total/li.total_revenue*100),"From state aid","h-pink"],[pct(li.federal_aid/li.total_revenue*100),"From federal aid","glow-blue"],[full(li.total_revenue/li.enr),"Revenue per pupil","glow-teal"]];
 $("hero-stats").innerHTML=s.map(function(x){return'<div class="stat"><span class="n '+x[2]+'">'+x[0]+'</span><span class="l '+x[2]+'">'+x[1]+'</span></div>'}).join("")}

function findings(){
 var by=function(n){return D.filter(function(r){return r.name.indexOf(n)===0})[0]};
 var b=by("Brentwood"),m=by("Manhasset");
 var nas=agg(D.filter(function(r){return r.county==="Nassau"})),suf=agg(D.filter(function(r){return r.county==="Suffolk"}));
 var low=D.filter(function(r){return r.state_pct<10}).length,hi=D.filter(function(r){return r.state_pct>50}).length;
 var top=D.slice().sort(function(a,b){return b.state_pct-a.state_pct})[0];
 var f=[
  ['<span class="h-pink">'+pct(b.state_pct)+'</span> vs <span class="h-lime">'+pct(m.state_pct)+'</span>',"Brentwood got "+pct(b.state_pct)+" of its revenue from the state. Manhasset got "+pct(m.state_pct)+". They took in almost the same amount per student: "+full(b.total_revenue/b.enr)+" and "+full(m.total_revenue/m.enr)+"."],
  ['<span class="h-lime">'+low+'</span> / <span class="h-pink">'+hi+'</span>',low+" districts got less than 10% of their revenue from state aid, and "+hi+" got more than half. "+top.name+" leaned on the state most, at "+pct(top.state_pct)+"."],
  ['<span class="glow-teal">'+pct(suf.state_aid_total/suf.total_revenue*100)+'</span>',"State aid was "+pct(suf.state_aid_total/suf.total_revenue*100)+" of Suffolk district revenue and "+pct(nas.state_aid_total/nas.total_revenue*100)+" in Nassau. Nassau leaned harder on property taxes: "+pct(nas.property_tax/nas.total_revenue*100)+", against "+pct(suf.property_tax/suf.total_revenue*100)+" in Suffolk."]
 ];
 $("findings-list").innerHTML=f.map(function(x){return'<div class="finding"><div class="big">'+x[0]+'</div><p>'+x[1]+'</p></div>'}).join("")}

function mix(){
 $("mix-legend").innerHTML=SRC.map(function(s){return'<span class="lg"><i class="sw" style="background:'+s.c+'"></i>'+s.l+'</span>'}).join("");
 pills($("mix-sort"),[["local","% local"],["state","% state"],["federal","% federal"],["rev","Revenue"],["name","A-Z"]],st.mixSort,function(v){st.mixSort=v;mix()});
 pills($("mix-county"),[["All","All"],["Nassau","Nassau"],["Suffolk","Suffolk"]],st.mixCounty,function(v){st.mixCounty=v;mix()});
 var rows=D.filter(function(r){return st.mixCounty==="All"||r.county===st.mixCounty});
 var key={local:function(r){return -r.local_share},state:function(r){return -r.state_pct},federal:function(r){return -r.federal_aid/r.total_revenue},rev:function(r){return -r.total_revenue},name:function(r){return r.name}}[st.mixSort];
 rows.sort(function(a,b){var x=key(a),y=key(b);return x<y?-1:x>y?1:0});
 var lab=st.mixSort==="state"?function(r){return pct(r.state_pct)}:st.mixSort==="federal"?function(r){return pct(r.federal_aid/r.total_revenue*100)}:st.mixSort==="rev"?function(r){return money(r.total_revenue)}:function(r){return pct(r.local_share)};
 $("mix-bars").innerHTML=rows.map(function(r){
  var segs=SRC.map(function(s){var w=Math.max(0,r[s.k]/r.total_revenue*100);return'<i style="width:'+w+'%;background:'+s.c+'" title="'+s.l+": "+pct(w)+'"></i>'}).join("");
  return'<div class="mrow" title="'+r.name+'"><span class="nm">'+r.name+'</span><div class="bar">'+segs+'</div><span class="pc">'+lab(r)+'</span></div>'}).join("")}

function table(){
 pills($("unit"),[["usd","Dollars"],["pct","% of total"],["pp","Per pupil"]],st.unit,function(v){st.unit=v;table()});
 pills($("county"),[["All","All"],["Nassau","Nassau"],["Suffolk","Suffolk"]],st.county,function(v){st.county=v;table()});
 var t=$("ftable");
 t.tHead.innerHTML="<tr><th data-k=\"name\""+(st.sort==="name"?' class="sorted"':"")+">District</th>"+COLS.map(function(c){var cl=[];if(c.ctx)cl.push("ctx");if(st.sort===c.k)cl.push("sorted");var sw=colorOf[c.k]&&!c.ctx?'<i class="k" style="background:'+colorOf[c.k]+'"></i>':"";return'<th data-k="'+c.k+'" class="'+cl.join(" ")+'">'+sw+c.l+(st.sort===c.k?(st.dir<0?" ▼":" ▲"):"")+"</th>"}).join("")+"</tr>";
 Array.prototype.forEach.call(t.tHead.querySelectorAll("th"),function(th){th.onclick=function(){var k=th.getAttribute("data-k");if(st.sort===k)st.dir*=-1;else{st.sort=k;st.dir=k==="name"?1:-1}table()}});
 var q=st.q.toLowerCase();
 var rows=D.filter(function(r){return(st.county==="All"||r.county===st.county)&&(!q||r.name.toLowerCase().indexOf(q)>=0)});
 var sc=COLS.filter(function(c){return c.k===st.sort})[0];
 rows.sort(function(a,b){if(st.sort==="name")return st.dir*a.name.localeCompare(b.name);var x=val(a,sc),y=val(b,sc);if(x==null)return 1;if(y==null)return -1;return st.dir*(x-y)});
 function cells(r,isAgg){return COLS.map(function(c){var s=fmt(r,c);var cl=[];if(c.tot)cl.push("tot");if(c.ctx)cl.push("ctx");if(s==null){cl.push("na");s="n/a"}else if(val(r,c)<0)cl.push("neg");return'<td class="'+cl.join(" ")+'">'+s+"</td>"}).join("")}
 t.tBodies[0].innerHTML=rows.map(function(r){return"<tr><td>"+r.name+'<span class="cty">'+(r.county==="Nassau"?"NAS":"SUF")+"</span></td>"+cells(r)+"</tr>"}).join("");
 var foot=[];if(st.county!=="Suffolk")foot.push([agg(D.filter(function(r){return r.county==="Nassau"}),"Nassau total"),""]);
 if(st.county!=="Nassau")foot.push([agg(D.filter(function(r){return r.county==="Suffolk"}),"Suffolk total"),""]);
 foot.push([agg(D,"Long Island total"),"li"]);
 t.tFoot.innerHTML=foot.map(function(f){return'<tr class="'+f[1]+'"><td>'+f[0].name+"</td>"+cells(f[0],1)+"</tr>"}).join("");
 $("table-note").textContent=rows.length+" of 125 districts shown. Revenue is fiscal 2024-25 actuals. Blue columns are for context and aren't counted in total revenue. Per-pupil figures divide by fall 2024 K-12 enrollment. Subtotals always cover every district in the county.";
}
$("search").addEventListener("input",function(e){st.q=e.target.value;table()});

function ramp(p){var stops=[[0,"#0b1a3a"],[10,"#1d3f8f"],[25,"#3d7eff"],[40,"#c45cff"],[55,"#ff2d6a"],[70,"#ff8c00"]];var c=stops[0][1];stops.forEach(function(s){if(p>=s[0])c=s[1]});return c}
function map(){
 if(!window.L){$("map").innerHTML='<p class="note" style="padding:20px">Map library failed to load.</p>';return}
 var m=L.map("map",{scrollWheelZoom:false,zoomSnap:.25}).setView([40.82,-73.05],9.25);
 L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",{maxZoom:16,attribution:"Basemap &copy; Esri"}).addTo(m);
 var byN={};D.forEach(function(r){byN[r.nces]=r});
 function pop(r){return'<div class="pop"><h3>'+r.name+'</h3><div class="c">'+r.county+" County · 2024-25</div><div class=\"kv\">"+
  [["State aid",pct(r.state_pct)],["Property taxes",pct(r.property_tax/r.total_revenue*100)],["STAR",pct(r.star/r.total_revenue*100)],["Federal aid",pct(r.federal_aid/r.total_revenue*100)],["Local share",pct(r.local_share)],["Total revenue",money(r.total_revenue)],["Per pupil",r.enr?full(r.total_revenue/r.enr):"n/a"]].map(function(x){return"<span>"+x[0]+"</span><b>"+x[1]+"</b>"}).join("")+"</div></div>"}
 fetch("data/boundaries.geojson").then(function(r){return r.json()}).then(function(g){
  var lay=L.geoJSON(g,{style:function(f){var r=byN[f.properties.id];return{color:"#000",weight:.8,fillColor:r?ramp(r.state_pct):"#111",fillOpacity:.82}},
   onEachFeature:function(f,l){var r=byN[f.properties.id];if(!r)return;l.bindPopup(pop(r));l.on("mouseover",function(){l.setStyle({color:"#c8ff00",weight:2})});l.on("mouseout",function(){lay.resetStyle(l)})}}).addTo(m);
  m.fitBounds(lay.getBounds(),{padding:[10,10]});
  var have={};g.features.forEach(function(f){have[f.properties.id]=1});
  D.forEach(function(r){if(!have[r.nces]&&r.lat){L.circleMarker([r.lat,r.lon],{radius:6,color:"#000",weight:1,fillColor:ramp(r.state_pct),fillOpacity:1}).bindPopup(pop(r)).addTo(m)}});
 });
 var st0=[[0,"0"],[10,"10"],[25,"25"],[40,"40"],[55,"55"],[70,"70%+"]];
 $("map-legend").innerHTML='<div class="t">State aid, % of revenue</div><div class="ramp">'+st0.map(function(s){return'<div style="background:'+ramp(s[0])+'"></div>'}).join("")+'</div><div class="ramp-l">'+st0.map(function(s){return"<span>"+s[1]+"</span>"}).join("")+"</div>";
}
})();
