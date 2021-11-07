const DOMException = require("domexception");

const {enableFetchMocks} = require('jest-fetch-mock');
enableFetchMocks();

globalThis.DOMException = DOMException;
