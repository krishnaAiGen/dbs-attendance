const { PDFParse } = require('pdf-parse');
const fs = require('fs');

async function test() {
    try {
        console.log('Testing PDFParse invocation');
        // Create a dummy buffer (not a real PDF, might fail parsing but function should be callable)
        const buffer = Buffer.from('dummy pdf content');

        // Just checking if it returns a promise or crashes immediately
        const result = PDFParse(buffer);
        console.log('Result type:', typeof result);
        if (result instanceof Promise) {
            console.log('Result is a Promise');
            result.catch(err => console.log('Promise rejected (expected):', err.message));
        }
    } catch (e) {
        console.log('Invocation error:', e.message);
    }
}

test();
