'use strict';

const parselog = require('..');
const assert = require('assert').strict;

assert.strictEqual(parselog(), 'Hello from parselog');
console.info("parselog tests passed");
