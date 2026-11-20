(function(){
"use strict";
var S={year:2025,q:"",sort:"total_dollars",dir:-1,sel:"280205"};
var DATA=null;
var $=function(id){return document.getElementById(id)};
var COLS=[
 {k:"basic_count",l:"Basic",s:"exemptions"},
 {k:"basic_dollars",l:"Basic",s:"reimbursement"},
 {k:"enhanced_count",l:"Enhanced",s:"exemptions"},
 {k:"enhanced_dollars",l:"Enhanced",s:"reimbursement"},
 {k:"total_count",l:"Total",s:"exemptions"},
 {k:"total_dollars",l:"Total",s:"reimbursement"},
 {k:"osc",l:"STAR revenue",s:"this district · FY2024-25"}
];
function esc(v){return String(v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]})}
function cents(v){return Math.round(Number(v)*100)}
function money(v){
 if(v==null)return"—";
 var n=Number(v),centsOn=Math.abs(cents(n)%100)!==0;
 return (n<0?"-":"")+"$"+Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:centsOn?2:0,maximumFractionDigits:centsOn?2:0});
}
function count(v){return v==null?"—":Number(v).toLocaleString("en-US")}
function dateLabel(iso){
 var p=String(iso).split("-");
 var months=["January","February","March","April","May","June","July","August","September","October","November","December"];
 return months[Number(p[1])-1]+" "+Number(p[2])+", "+p[0];
}
function county(){return DATA.county.filter(function(c){return c.year===S.year})[0]}
function byId(id){return DATA.districts.filter(function(d){return d.id===id})[0]}
function yearOf(d){return d.years[String(S.year)]}
function totalCount(y){return y?y.basic_count+y.enhanced_count:null}
function metric(d){
 if(S.sort==="osc")return d.osc_star_fy2024_25;
 var y=yearOf(d);if(!y)return null;
 if(S.sort==="total_count")return totalCount(y);
 return y[S.sort];
}
function rows(){
 var q=S.q.trim().toLowerCase();
 var list=DATA.districts.filter(function(d){return !q||d.name.toLowerCase().indexOf(q)>=0});
 list.sort(function(a,b){
  if(S.sort==="name")return S.dir*a.name.localeCompare(b.name);
  var x=metric(a),y=metric(b);
  if(x==null&&y==null)return a.name.localeCompare(b.name);
  if(x==null)return 1;if(y==null)return -1;
  if(x===y)return a.name.localeCompare(b.name);
  return S.dir*(x-y);
 });
 return list;
}
function sumOf(list){
 var o={n:0,basic_count:0,basic_dollars:0,enhanced_count:0,enhanced_dollars:0,total_dollars:0,total_count:0};
 list.forEach(function(d){
  var y=yearOf(d);if(!y)return;
  o.n++;
  o.basic_count+=y.basic_count;o.basic_dollars+=y.basic_dollars;
  o.enhanced_count+=y.enhanced_count;o.enhanced_dollars+=y.enhanced_dollars;
  o.total_dollars+=y.total_dollars;o.total_count+=totalCount(y);
 });
 return o;
}
function link(src,label){return '<a href="'+esc(src.url)+'">'+esc(label||src.id)+"</a>"}

function render(opts){
 opts=opts||{};
 var wrap=$("star-table").parentElement,keep=opts.keepScroll?wrap.scrollTop:0;
 var c=county();
 stats(c);bar(c);gap(c);years();yearLabel(c);detail();table();footnote();
 if(opts.keepScroll)wrap.scrollTop=keep;
}

function stats(c){
 var cards=[
  [money(c.total_dollars),"Nassau county total","h-lime",null],
  [count(c.basic_count),"Basic exemptions","glow-teal",money(c.basic_dollars)],
  [count(c.enhanced_count),"Enhanced exemptions","h-pink",money(c.enhanced_dollars)],
  [money(c.gap_dollars),"Left unallocated","gap","County total minus the district rows"]
 ];
 $("star-stats").innerHTML=cards.map(function(card){
  return '<div class="stat"><span class="n '+(card[2]==="gap"?"":card[2])+'">'+card[0]+'</span><span class="l '+(card[2]==="gap"?"":card[2])+'">'+card[1]+'</span>'+(card[3]?'<span class="subn">'+card[3]+"</span>":"")+"</div>";
 }).join("");
 var extremes=extremesOf();
 $("star-rank").innerHTML=extremes;
}

function extremesOf(){
 var list=DATA.districts.filter(function(d){return yearOf(d)});
 if(!list.length)return "";
 function pick(dir){
  var best=null;
  list.forEach(function(d){
   var v=yearOf(d).total_dollars;
   if(!best||(dir<0?v>best.v:v<best.v))best={v:v,names:[d.name],count:totalCount(yearOf(d))};
   else if(v===best.v)best.names.push(d.name);
  });
  return best;
 }
 var hi=pick(-1),lo=pick(1);
 function phrase(x){return x.names.map(esc).join(", ")+", "+money(x.v)+" ("+count(x.count)+" exemptions)";}
 return "Highest reimbursement this levy year: "+phrase(hi)+". Lowest: "+phrase(lo)+".";
}

function bar(c){
 var b=c.basic_dollars/c.total_dollars*100,e=c.enhanced_dollars/c.total_dollars*100;
 $("star-mix").innerHTML='<div class="star-splitbar" role="img" aria-label="Basic '+money(c.basic_dollars)+', Enhanced '+money(c.enhanced_dollars)+'"><i style="width:'+b+'%;background:#00ffd0"></i><i style="width:'+e+'%;background:#c45cff"></i></div><div class="star-key"><span class="lg"><i class="sw" style="background:#00ffd0"></i>Basic '+money(c.basic_dollars)+'</span><span class="lg"><i class="sw" style="background:#c45cff"></i>Enhanced '+money(c.enhanced_dollars)+"</span></div>";
}

function gap(c){
 var src=DATA.sources;
 $("star-gap").innerHTML="The Nassau county total for levy year "+c.year+" is <b>"+money(c.total_dollars)+"</b> ("+link(src.county,"vdat-cgbe")+", "+esc(c.school_year)+" bills, prepared "+esc(dateLabel(c.prepared))+"). The 53 district rows in "+link(src.district,"aa3i-eamx")+" sum to <b>"+money(c.district_rows_dollars)+"</b>. The difference, <b>"+money(c.gap_dollars)+"</b>, is left unallocated in the state file. The three central high school districts do not account for it: their exemptions are already inside the component rows. The state notes that some districts cross county lines and that the county and district files can differ because of that.";
}

function years(){
 var el=$("star-years");
 el.innerHTML="";
 DATA.years.forEach(function(year){
  var b=document.createElement("button");
  b.type="button";
  b.className="pill"+(year===S.year?" on":"");
  b.textContent=String(year);
  b.setAttribute("aria-pressed",year===S.year?"true":"false");
  b.onclick=function(){S.year=year;render()};
  el.appendChild(b);
 });
}

function yearLabel(c){
 $("star-yearlabel").innerHTML="Showing levy year <b>"+c.year+"</b> · "+esc(c.school_year)+" school tax bills · district file "+link(DATA.sources.district,"aa3i-eamx")+" · county file "+link(DATA.sources.county,"vdat-cgbe")+" · prepared "+esc(dateLabel(c.prepared))+" · retrieved November 20, 2026.";
}

function detail(){
 var d=byId(S.sel)||DATA.districts[0];
 var y=yearOf(d);
 var c=county();
 var html='<div class="star-detail-head"><h3>'+esc(d.name)+'</h3><div class="meta">Levy year '+c.year+" · "+esc(c.school_year)+" bills</div></div>";
 html+='<div class="star-detail-grid"><div><p class="kicker-mini">STAR exemptions on this district\'s tax bills</p>';
 if(!y){
  html+='<p>No exemption counts or reimbursement dollars are published for this central high school district. The state includes them in the rows of its component elementary districts.</p>';
  if(d.components&&d.components.length){
   html+='<div class="pills" style="margin-top:10px">'+d.components.map(function(k){return '<button type="button" class="pill" data-goto="'+esc(k.id)+'">'+esc(k.name)+"</button>"}).join("")+"</div>";
  }
 }else{
  html+='<dl class="star-dl">'
   +line("Basic",y.basic_count,y.basic_dollars)
   +line("Enhanced",y.enhanced_count,y.enhanced_dollars)
   +line("Total",totalCount(y),y.total_dollars)
   +"</dl>";
  if(d.chsd_group){
   html+='<p class="note">These counts and dollars include '+esc(d.chsd_group)+". The state reports that central high school district inside this elementary district's row. This is exemptions on the tax bills, not only this district's own levy.</p>";
  }
 }
 html+='</div><div class="star-oscbox"><p class="kicker-mini">This district\'s STAR revenue</p><p class="osc-n">'+money(d.osc_star_fy2024_25)+'</p><p class="note">Comptroller account 1085, fiscal year 2024-25. This is the figure in the funding mix above. It is not added to the exemption reimbursement.</p>';
 html+='<p class="note">'+esc(relation(d,y))+"</p></div></div>";
 html+=savingsBlock(d);
 $("star-detail").innerHTML=html;
 Array.prototype.forEach.call($("star-detail").querySelectorAll("[data-goto]"),function(btn){
  btn.onclick=function(){
   S.sel=btn.getAttribute("data-goto");
   S.q="";
   $("star-search").value="";
   render();
   var row=document.querySelector('#star-table tr[data-id="'+S.sel+'"]');
   if(row)row.scrollIntoView({block:"nearest"});
  };
 });
}
function line(label,n,dollars){
 return "<div><dt>"+label+"</dt><dd>"+count(n)+"</dd><dd>"+money(dollars)+"</dd></div>";
}
function relation(d,y){
 if(!y)return "Only the Comptroller revenue is published for this district. There is no Basic or Enhanced split of its own.";
 if(y.total_dollars===d.osc_star_fy2024_25)return "For this levy year, the exemption total is the same dollar amount as this district's FY2024-25 STAR revenue.";
 if(S.year===2024&&d.chsd_group&&y.total_dollars>d.osc_star_fy2024_25)return "For levy year 2024 the exemption total is higher than this district's STAR revenue because the row includes the central high school district.";
 if(d.chsd_group)return "This district's STAR revenue is FY2024-25 only. The exemption row also includes the central high school district, so the two figures are not one comparison.";
 return "This district's STAR revenue is fiscal year 2024-25, the same school year as levy year 2024. The exemption total follows the levy year selected above.";
}
function savingsBlock(d){
 var m=d.max_savings;
 if(!m)return "";
 var src=DATA.sources.max_savings;
 var html='<div class="star-max"><p class="kicker-mini">Maximum savings for one homeowner</p>';
 html+='<p class="meta">Levy year '+m.levy_year+" · "+esc(m.school_year)+" · "+esc(m.tax_class_label)+" · "+link(src,"jajz-mu5n")+"</p>";
 if(S.year!==2025)html+='<p class="note">This maximum is for levy year 2025. It does not change with the year selected above.</p>';
 html+='<dl class="star-dl star-dl-save">'
  +'<div><dt>Basic</dt><dd>Credit '+money(m.basic_credit)+"</dd><dd>Exemption "+money(m.basic_exemption)+"</dd></div>"
  +'<div><dt>Enhanced</dt><dd>Credit '+money(m.enhanced_credit)+"</dd><dd>Exemption "+money(m.enhanced_exemption)+"</dd></div>"
  +"</dl>";
 html+='<p class="note">'+esc(savingsNote(m))+" Published maximums for one qualifying homeowner. Not a count of recipients, and not a program total.</p></div>";
 return html;
}
function savingsNote(m){
 var bits=[];
 [["Basic",m.basic_credit,m.basic_exemption],["Enhanced",m.enhanced_credit,m.enhanced_exemption]].forEach(function(row){
  var delta=cents(row[1])-cents(row[2]);
  if(delta>0)bits.push(row[0]+" credit maximum is "+money(delta/100)+" above the exemption maximum");
  else if(delta<0)bits.push(row[0]+" exemption maximum is "+money((-delta)/100)+" above the credit maximum");
 });
 if(!bits.length)return "The credit and exemption maximums are the same.";
 return bits.join(". ")+".";
}

function table(){
 var c=county();
 var t=$("star-table");
 t.setAttribute("aria-label","Nassau STAR exemptions, levy year "+c.year);
 var head="<tr><th data-k=\"name\""+(S.sort==="name"?' class="sorted"':"")+">District"+(S.sort==="name"?(S.dir<0?" ▼":" ▲"):"")+"</th>";
 head+=COLS.map(function(col){
  var on=S.sort===col.k;
  var cls=on?"sorted":"";
  if(col.k==="osc")cls=(cls?cls+" ":"")+"ctx";
  if(col.k==="total_dollars"||col.k==="total_count")cls=(cls?cls+" ":"")+"tot";
  return '<th data-k="'+col.k+'"'+(cls?' class="'+cls+'"':"")+">"+esc(col.l)+'<span class="sub">'+esc(col.s)+"</span>"+(on?(S.dir<0?" ▼":" ▲"):"")+"</th>";
 }).join("");
 t.tHead.innerHTML=head+"</tr>";
 Array.prototype.forEach.call(t.tHead.querySelectorAll("th"),function(th){
  th.onclick=function(){
   var k=th.getAttribute("data-k");
   if(S.sort===k)S.dir*=-1;else{S.sort=k;S.dir=k==="name"?1:-1}
   render();
  };
 });
 var list=rows();
 t.tBodies[0].innerHTML=list.map(function(d){
  var y=yearOf(d);
  var tag=d.chsd?'<span class="tag chsd">No DTF row</span>':d.chsd_group?'<span class="tag part">Includes CHSD</span>':"";
  var title=d.chsd?"No exemption row is published. STAR for this levy is included in the component elementary districts.":d.chsd_group?"Includes "+d.chsd_group+".":"";
  var cls=d.id===S.sel?"sel":"";
  return '<tr data-id="'+esc(d.id)+'" tabindex="0" class="'+cls+'"'+(title?' title="'+esc(title)+'"':"")+'><td>'+esc(d.name)+tag+"</td>"+cells(d,y)+"</tr>";
 }).join("");
 Array.prototype.forEach.call(t.tBodies[0].querySelectorAll("tr"),function(tr){
  function pick(){
   S.sel=tr.getAttribute("data-id");
   render({keepScroll:true});
   if(window.matchMedia("(max-width:800px)").matches)$("star-detail").scrollIntoView({block:"start"});
  }
  tr.onclick=pick;
  tr.onkeydown=function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();pick()}};
 });
 var shown=sumOf(list);
 var all=sumOf(DATA.districts);
 var unfiltered=list.length===DATA.districts.length;
 var foot="";
 foot+=footRow(shown.n+" district rows",shown,false);
 if(unfiltered){
  foot+=footRow("Nassau county",{
   basic_count:c.basic_count,basic_dollars:c.basic_dollars,
   enhanced_count:c.enhanced_count,enhanced_dollars:c.enhanced_dollars,
   total_count:c.basic_count+c.enhanced_count,total_dollars:c.total_dollars
  },false);
  foot+=footRow("Unallocated",{
   basic_count:c.basic_count-all.basic_count,basic_dollars:c.basic_dollars-all.basic_dollars,
   enhanced_count:c.enhanced_count-all.enhanced_count,enhanced_dollars:c.enhanced_dollars-all.enhanced_dollars,
   total_count:(c.basic_count+c.enhanced_count)-all.total_count,total_dollars:c.gap_dollars
  },true);
 }
 t.tFoot.innerHTML=foot;
}
function cells(d,y){
 return COLS.map(function(col){
  var v,cls=[];
  if(col.k==="osc"){v=money(d.osc_star_fy2024_25);cls.push("ctx")}
  else if(!y){v="—";cls.push("na")}
  else if(col.k==="total_count"){v=count(totalCount(y));cls.push("tot")}
  else if(col.k.indexOf("dollars")>=0){v=money(y[col.k]);if(col.k==="total_dollars")cls.push("tot")}
  else v=count(y[col.k]);
  return '<td'+(cls.length?' class="'+cls.join(" ")+'"':"")+">"+v+"</td>";
 }).join("");
}
function footRow(label,o,gap){
 var cls=gap?"gap":"";
 function td(v,extra){var c=[extra||"",gap?"gap":""].filter(Boolean).join(" ");return "<td"+(c?' class="'+c+'"':"")+">"+v+"</td>"}
 return '<tr class="'+cls+'"><td>'+esc(label)+"</td>"
  +td(count(o.basic_count))+td(money(o.basic_dollars))
  +td(count(o.enhanced_count))+td(money(o.enhanced_dollars))
  +td(count(o.total_count),"tot")+td(money(o.total_dollars),"tot")
  +td("—","ctx")+"</tr>";
}
function footnote(){
 var osc=DATA.osc_fy2024_25;
 $("star-footnote").innerHTML="The last column is this district's STAR revenue: Comptroller account "+esc(osc.account)+", FY"+esc(osc.fiscal_year)+". Across the 56 Nassau districts it is "+money(osc.nassau_total)+", of which "+money(osc.central_high_school_total)+" is booked on Bellmore-Merrick, Sewanhaka, and Valley Stream Central. Those three have no exemption row. Their exemptions are inside 11 component elementary districts, marked “Includes CHSD.” Do not add the revenue column to the reimbursement columns. Class 1 maximums are in the district detail ("+link(DATA.sources.max_savings,"jajz-mu5n")+", levy year 2025). STAR credit counts and credit dollars are not published by district. Recipient lists are confidential and are not shown.";
}

fetch("data/star.json").then(function(r){if(!r.ok)throw new Error(String(r.status));return r.json()}).then(function(j){
 DATA=j;
 if(DATA.years.indexOf(DATA.default_year)>=0)S.year=DATA.default_year;
 render();
}).catch(function(){
 $("star-gap").textContent="The STAR exemption file did not load.";
});
$("star-search").addEventListener("input",function(e){S.q=e.target.value;if(DATA)render({keepScroll:true})});
})();
