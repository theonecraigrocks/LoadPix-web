import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../styles.css",import.meta.url),"utf8");
const sw=readFileSync(new URL("../sw.js",import.meta.url),"utf8");

test("every photo category provides visible in-app camera and gallery choices",()=>{
  assert.match(app,/photoPicker\("📷 Take Photo",session\.id,category,null,"camera"/);
  assert.match(app,/photoPicker\("🖼 Add Photo from Gallery",session\.id,category,null,"gallery"/);
  assert.match(css,/\.photo-upload-actions/);
  assert.match(css,/\.photo-picker input\[type="file"\]/);
});
test("camera requests capture, while gallery uses native picker without capture",()=>{
  assert.match(app,/input\.accept = "image\/\*"/);
  assert.match(app,/if\(source === "camera"\) input\.setAttribute\("capture", "environment"\)/);
  assert.match(app,/saveChosenPhoto\(photo,\{sessionID,category,replaceID\}\)/);
  assert.match(app,/await savePhoto\(session,file,category,replaceID\)/);
  assert.doesNotMatch(html,/id="gallery-input"/);
});
test("file import is independent of dispatch and confusing direct SMS action is gone",()=>{
  assert.doesNotMatch(app,/Open Messages to dispatch/);
  assert.doesNotMatch(app,/window\.location\.href\s*=\s*"sms:/);
  assert.match(app,/Send completed load to dispatch/);
  assert.match(app,/Send to Dispatch — Review in Messages/);
  assert.match(app,/if\(missing\.length\)/);
});
test("cached web app updates source when online, retains local sessions",()=>{
  assert.match(sw,/loadpix-web-shell-v3-gallery/);
  assert.match(sw,/fetch\(req\)\.then\(response/);
  assert.doesNotMatch(sw,/indexedDB\.deleteDatabase/);
});
