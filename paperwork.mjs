// Conservative, label-anchored suggestions only. Never save OCR output without driver review.
// No customer paperwork is transmitted to the parser.
const LABELS = {
  trailer: /(?:^|[^A-Z0-9])(?:TRAILER|TRLR|TRL)\s*(?:#|NO\.?|NUMBER|ID)?\s*[:#=\-]?\s*/i,
  bol: /(?:^|[^A-Z0-9])(?:BILL\s+OF\s+LADING|B\s*\/\s*L|BOL)\s*(?:#|NO\.?|NUMBER)?\s*[:#=\-]?\s*/i
};
const BAD = new Set(["NUMBER","NO","BOL","BILL","LADING","TRAILER","TRLR","TRUCK","TEMP","TEMPERATURE","SEAL","DATE","LOAD"]);

function findLabeled(text, label, lengthLimit) {
  const lines=String(text||"").replace(/\r/g,"").split("\n");
  for(let i=0;i<lines.length;i++){
    const m=LABELS[label].exec(lines[i]);
    if(!m)continue;
    const rest=lines[i].slice(m.index+m[0].length).trim();
    const options=[rest,lines[i+1]||""];
    for(const line of options){
      const candidate=/^([A-Za-z0-9][A-Za-z0-9\/-]*)\b/.exec(line.trim().replace(/^[#:\-=.\s]+/,""));
      if (!candidate) continue;
      const token=candidate[1].replace(/[\/-]+$/,"");
      if(token.length<4||token.length>lengthLimit||BAD.has(token.toUpperCase()))continue;
      if(label==="bol" && token.replace(/\D/g,"").length<4)continue;
      return token;
    }
  }
  return "";
}
export function extractPaperwork(text) {
  const bolNumber=findLabeled(text,"bol",30);
  return {
    trailer:findLabeled(text,"trailer",20),
    bol4:bolNumber?bolNumber.replace(/\D/g,"").slice(-4):"",
    bolNumber
  };
}
