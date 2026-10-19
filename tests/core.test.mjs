import test from "node:test";
import assert from "node:assert/strict";
import {CATEGORIES,heading,normalizePhone,normalizeBOL,newSession,missingPhotos,messageBody,batchCount} from "../core.mjs";

test("delivery and pickup labels are uppercase and never duplicated", () => {
  assert.equal(heading("Pickup"), "LOAD PICKUP");
  assert.equal(heading("Delivery"), "LOAD DELIVERY");
  const session = newSession("Delivery",{driver:"Jack",truck:"42"},"test-id",Date.UTC(2026,9,19));
  assert.equal(messageBody(session).split("\n")[0],"LOAD DELIVERY");
  assert.equal(messageBody(session).match(/LOAD DELIVERY/g).length,1);
  assert.equal(messageBody(session).includes("Subject:"),false);
});
test("photo requirements stay aligned with Android", () => {
  assert.deepEqual(CATEGORIES.Pickup,["Freight","Seal","Back of trailer","Trailer temperature","Paperwork"]);
  assert.deepEqual(CATEGORIES.Delivery,["Signed paperwork"]);
  const pickup = newSession("Pickup",{},"abc",Date.now());
  assert.equal(missingPhotos(pickup).length,5);
  pickup.photos=CATEGORIES.Pickup.map((category,i)=>({id:String(i),category}));
  assert.equal(missingPhotos(pickup).length,0);
  assert.equal(batchCount({...pickup,photos:[...pickup.photos,...pickup.photos.slice(0,2)]}),3);
});
test("phone and BOL validation", () => {
  assert.equal(normalizePhone("+1 (919) 555-0123"),"+19195550123");
  assert.equal(normalizePhone("911"),"");
  assert.equal(normalizePhone("9195550123, 9195550124"),"");
  assert.equal(normalizeBOL("BOL #12-3X4"),"1234");
});
test("profile and per-session values", () => {
  const s = newSession("Pickup",{driver:" Driver ",truck:"102"},"a",20);
  assert.equal(s.driver,"Driver");
  assert.equal(s.truck,"102");
  assert.equal(s.trailer,"");
  assert.equal(s.bol4,"");
  s.trailer="A123"; s.bol4="0026"; s.note="Dock 1";
  assert.ok(messageBody(s).includes("Trailer: A123"));
  assert.ok(messageBody(s).includes("BOL last 4: 0026"));
});
