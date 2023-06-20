# Dependency.js

Barebones ES6 JavaScript dependency graph implementation. 

Node data should be managed externally.
Triggers responding to graph events should be handled externally based on returned values.

Does not guard cycle creation internally, yet does provide a check for if an update action will create a cycle.

## Tests

Tests implemented with Jest. 

`npm test` will run test package.
