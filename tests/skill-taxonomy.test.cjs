const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
test('taxonomy rejects unknown families and duplicate assignments, supports missing legacy taxonomy',async()=>{
 const {readTaxonomy}=await import('../tools/skill-taxonomy.mjs');
 const warnings=[];
 const raw=`## Skill Taxonomy v1
| YSU-SKILL-001 | image-style | 通用 | painting-illustration | 水彩 / Watercolor | 透明; 留白 |
| YSU-SKILL-002 | image-style | 通用 | watercolor-own-category | 水彩 | — |
| YSU-SKILL-001 | image-style | 通用 | paper-fiber | 紙 | — |
## Other content
| YSU-SKILL-003 | image-style | 通用 | paper-fiber | 紙 | — |`;
 const data=readTaxonomy(raw,(...w)=>warnings.push(w));
 assert.equal(data.size,1);assert.equal(warnings.length,2);
 assert.equal(data.get('YSU-SKILL-001').style_family_id,'painting-illustration');
 assert.deepEqual(data.get('YSU-SKILL-001').tags,['透明','留白']);
 assert.equal(readTaxonomy('# Old registry',()=>{}).size,0);
});
test('all current Skills have one purpose, twelve factory styles share three families',()=>{
 const index=JSON.parse(fs.readFileSync('skills.json'));
 for(const s of index.skills) assert.ok(s.taxonomy?.domain_id,s.id);
 const batch=index.skills.filter(s=>/^YSU-SKILL-(01[4-9]|02[0-5])$/.test(s.id));
 assert.equal(batch.length,12);
 assert.equal(new Set(batch.map(s=>s.taxonomy.style_family_id)).size,3);
 assert.ok(batch.every(s=>s.taxonomy.domain_id==='image-style'));
 assert.equal(batch.find(s=>s.id==='YSU-SKILL-019').taxonomy.medium,'不透明手繪色面 / Opaque painted color');
});
