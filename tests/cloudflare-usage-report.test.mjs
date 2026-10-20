import test from 'node:test';import assert from 'node:assert/strict';
import {generateKeyPairSync,privateDecrypt,createDecipheriv,constants} from 'node:crypto';
import {seal,costEstimate} from '../scripts/cloudflare-usage-report.mjs';
test('usage report is authenticated and only decrypts with the private key',()=>{
 const {publicKey,privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});const report={reads:1234567};
 const sealed=seal(report,publicKey);assert.ok(!sealed.includes('1234567'));
 const e=JSON.parse(Buffer.from(sealed,'base64'));const key=privateDecrypt({key:privateKey,oaepHash:'sha256',padding:constants.RSA_PKCS1_OAEP_PADDING},Buffer.from(e.key,'base64'));
 const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(e.iv,'base64'));decipher.setAuthTag(Buffer.from(e.tag,'base64'));
 assert.deepEqual(JSON.parse(Buffer.concat([decipher.update(Buffer.from(e.data,'base64')),decipher.final()])),report);
});
test('included usage has no extras and missing Worker metrics stay unknown',()=>{
 const cost=costEstimate({reads:25e9,writes:50e6,storageBytes:5e9,requests:null,cpuTimeUs:null});
 assert.equal(cost.d1ReadsExtraUsd,0);assert.equal(cost.d1WritesExtraUsd,0);assert.equal(cost.workersRequestsExtraUsd,null);assert.equal(cost.workersCpuExtraUsd,null);
});
test('overages are computed only above each included allowance',()=>{
 const cost=costEstimate({reads:26e9,writes:51e6,storageBytes:6e9,requests:11e6,cpuTimeUs:31e9});
 assert.equal(cost.d1ReadsExtraUsd,1);assert.equal(cost.d1WritesExtraUsd,1);assert.equal(cost.storageMonthlyRunRateExtraUsd,.75);assert.equal(cost.workersRequestsExtraUsd,.30);assert.equal(cost.workersCpuExtraUsd,.02);
});
