export default class Dependency {
  constructor(loadIns) {
    this._dependencies = loadIns?.dependencies || {}; // {a: {b: true}}, where a depends on b.
    // Will always add to this even if no dependences, to avoid also needing to make another node tracking lookup.
    this._dependers = loadIns?.dependers || {}; // {a: {b: true}} where b depends on a.
    this._cycleAllowed = loadIns?.cycleAllowed || false; // FUTURE: Expand support for cycles.
    this._numOfNodes = Object.keys(this._dependencies).length; // Set base count on init. Updated via add/remove.
    // If maintained, avoid having to do a full O(n) Object.keys() lookup every time we need a full count of the nodes.
  }

  export() {
    return {
      dependancies: this._dependencies,
      dependers: this._dependers,
      cycleAllowed: this._cycleAllowed,
    };
  }

  getNumberOfNodes() {
    return this._numOfNodes;
  }

  hasNodes() {
    return this.getNumberOfNodes() > 0;
  }

  changeID(oldID, newID) {
    if (!this.isNode(oldID) || this.isNode(newID)) {
      return false;
    }

    this._dependencies[newID] = this._dependencies[oldID];
    this._dependers[newID] = this._dependers[oldID];

    delete this._dependencies[oldID];
    delete this._dependers[oldID];

    Object.keys(this._dependencies).forEach((k) => {
      if (k[oldID]) {
        k[newID] = true;
        delete k[oldID];
      }
    });

    Object.keys(this._dependers).forEach((k) => {
      if (k[oldID]) {
        k[newID] = true;
        delete k[oldID];
      }
    });
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

  getDependers(n1) {
    if (!this.hasDependers(n1)) {
      return false;
    }

    return this._dependers[n1];
  }

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
      this._dependencies[id] = {};
      this.updateDependencies(id, dependencies);

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

  updateDependencies(id, dependencies) {
    if (!this.isNode(id)) {
      return false;
    }

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
        this._dependers[k][id] = true;
      }
    });

    return true;
  }

  addDependency(dependent, dependency) {
    if (
      !dependent ||
      !dependency ||
      !this.isNode(dependent) ||
      !this.isNode(dependency)
    ) {
      return false;
    }

    this._dependencies[dependent][dependency] = true;

    if (!this._dependers[dependency]) {
      this._dependers[dependency] = {};
    }

    this._dependers[dependency] = {
      ...this._dependers[dependency],
      ...{ [dependent]: true },
    };

    return true;
  }

  addDependencies(dependent, dependencies) {
    dependencies.forEach((dependency) =>
      this.addDependency(dependent, dependency)
    );
  }

  removeDependency(dependent, dependency) {
    if (
      !dependent ||
      !dependency ||
      !this.isNode(dependent) ||
      !this.isNode(dependency)
    ) {
      return false;
    }

    delete this._dependers[dependency][dependent];
    delete this._dependencies[dependent][dependency];
  }

  removeDependencies(dependent, dependencies) {
    dependencies.forEach((dependency) =>
      this.removeDependency(dependent, dependency)
    );
  }

  // Tests if adding targetID as a dependency to existingID will make a cycle.
  // FUTURE: Implement cycle check for environment where cycles are allowed. Issue is that if a cycle is allowed, it will
  // be potentially in the graph. And so once the first cycle is there, simple DFS or BFS will go forever. Would need an advanced algorithm that
  // marks visited nodes so nothing repeats.
  willMakeDependencyCycle(existingID, targetID) {
    if (this._cycleAllowed) {
      return;
    }

    const completesCycle = (id, dependancies) => {
      const dependanciesArr = Object.keys(dependancies);
      for (let index = 0; index < dependanciesArr.length; index++) {
        const upID = dependanciesArr[index];
        if (upID === id || completesCycle(id, this.getDependencies(upID))) {
          return true;
        }
      }
      return false;
    };

    return completesCycle(existingID, this.getDependencies(targetID));
  }
}
