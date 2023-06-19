export default class Dependency {
  constructor(loadIns) {
    this._dependencies = loadIns?.dependables || {}; // a: [b], where a depends on b.
    // Will always add to this even if no dependences, to avoid also needing to make another node tracking lookup.
    this._dependers = loadIns?.dependers || {}; // a: [b] where b depends on a.
    this._cycleAllowed = loadIns?.cycleAllowed || false;
    this._numOfNodes = Object.keys(this._dependencies).length; // Set base count on init. Updated via add/remove.
    // If maintained, avoid having to do a full O(n) Object.keys() lookup every time we need a full count of the nodes.
  }

  getNumberOfNodes() {
    return this._numOfNodes;
  }

  hasNodes() {
    return this.getNumberOfNodes() > 0;
  }

  isNode(n) {
    return this._dependencies[n] !== undefined;
  }

  hasDependers(n) {
    return this.isNode(n) && Object.keys(this._dependers[n]).length > 0;
  }

  hasDependencies(n) {
    return this.isNode(n) && Object.keys(this._dependencies[n]).length > 0;
  }

  dependsOn(n1, n2) {
    if (!this.hasDependencies(n1) || !this.hasDependers(n2)) {
      return false;
    }

    return this._dependencies[n1][n2] !== undefined;
  }

  dependedBy(n1, n2) {
    if (!this.hasDependencies(n2) || !this.hasDependers(n1)) {
      return false;
    }

    return this._dependers[n1][n2] !== undefined;
  }

  // TODO: Immediate. Handle extended?
  getDependers(n1) {
    if (!this.hasDependers(n1)) {
      return false;
    }

    return this._dependers[n1];
  }

  // TODO: Immediate. Handle extended?
  getDependencies(n1) {
    if (!this.hasDependencies(n1)) {
      return false;
    }

    return this._dependencies[n1];
  }

  // Accepts either an array of id keys, or a pre-setup object injection.
  // This second option would typically be the load in strategy if graph previous existed.
  // Whereas its cleaner to just add a list of arrays if the situation is a fresh start.
  // Returns 'ADDED' if add was clean, 'FAILED' if the add failed, 'UPDATED' if it already was in the network.
  addNode(id, dependencies = {}) {
    try {
      const existed = this.isNode(id);

      if (Array.isArray(dependencies)) {
        dependencies = dependencies.reduce((a, v) => ({ ...a, [v]: true }), {});
      }

      if (this._dependencies[id]) {
        Object.keys(this._dependencies[id]).forEach(
          (k) => delete this._dependers[k][id]
        );
      }

      this._dependencies[id] = dependencies;
      Object.keys(dependencies).forEach((k) => {
        if (this.isNode(k)) {
          if (!this._dependers[k]) {
            this._dependers[k] = {};
          }
          this._dependers[k] = { ...this._dependers[k], ...{ [id]: true } };
        }
      });

      this._numOfNodes += existed ? 0 : 1;
      // User can reflect their custom adjusted if being edited is different to them then a "fresh node".
      return existed ? "UPDATED" : "ADDED";
    } catch (e) {
      return "FAILED";
    }
  }

  // Returns {dependancies: ..., dependedBy: ...}} if removed, false if nothing was removed.
  // External user can then do what they will with that information, probably adjusted the conditions of the other affected node datapoints.
  removeNode(id) {
    try {
      if (!this.isNode(id)) {
        return false; // Wasn't a node.
      }

      const savedDependencies = this._dependencies[id]
        ? Object.keys(this._dependencies[id])
        : [];
      const savedDependers = this._dependers[id]
        ? Object.keys(this._dependers[id])
        : [];

      savedDependencies.forEach((k) => {
        if (this.isNode(k) && this._dependers[k]) {
          delete this._dependers[k][id];
        }
      });

      savedDependers.forEach((k) => {
        if (this.isNode(k) && this._dependencies[k]) {
          delete this._dependencies[k][id];
        }
      });

      delete this._dependencies[id];
      delete this._dependers[id];

      this._numOfNodes--;
      return { dependencies: savedDependencies, dependers: savedDependers };
    } catch (e) {
      return false;
    }
  }
}
