// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
// CRA's jsdom lacks Node's structuredClone, required by fake-indexeddb.
global.structuredClone = value => require('v8').deserialize(require('v8').serialize(value));
