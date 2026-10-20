import test from "node:test";
import assert from "node:assert/strict";
import {extractPaperwork} from "../paperwork.mjs";

test("reads conventional labeled paperwork",()=>{
  assert.deepEqual(extractPaperwork("Bill of Lading No: 1002345678\nTrailer # TR-40218\nSEAL 9999"),{
    trailer:"TR-40218",bol4:"5678",bolNumber:"1002345678"
  });
});
test("supports label with value on next line",()=>{
  assert.deepEqual(extractPaperwork("TRAILER NUMBER:\n728314\nBOL #:\n00987654"),{
    trailer:"728314",bol4:"7654",bolNumber:"00987654"
  });
});
test("never pulls unlabeled numbers from a page",()=>{
  assert.deepEqual(extractPaperwork("Seal 123456\nTruck 0012\nDate 10/19/26"),{
    trailer:"",bol4:"",bolNumber:""
  });
});
test("rejects ambiguous labels and bogus values",()=>{
  assert.deepEqual(extractPaperwork("Trailer temperature 34 F\nBOL NO\nSeal 234567"),{
    trailer:"",bol4:"",bolNumber:""
  });
});
