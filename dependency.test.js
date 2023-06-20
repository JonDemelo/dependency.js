import expect from "expect";
import Dependency from "./dependency.js";

describe("Testing loading strategies", () => {
  test("Empty graph", () => {
    const dep = new Dependency();

    expect(!dep.hasNodes()).toBe(true);
  });

  test("Graph with pre-existing data, one node without dependencies or dependents", () => {
    const nodeKey = "n1";
    const dependence = { [nodeKey]: {} };
    const dependers = { [nodeKey]: {} };
    const dep = new Dependency({
      dependencies: dependence,
      dependers: dependers,
    });

    expect(!dep.hasDependencies(nodeKey) && !dep.hasDependers(nodeKey)).toBe(
      true
    );
  });

  test("Graph with pre-existing data, one node as base and second node with first node as dependency", () => {
    const nodeKeyDependable = "n1";
    const nodeKeyDepender = "n2";

    const dependables = {
      [nodeKeyDependable]: {},
      [nodeKeyDepender]: { [nodeKeyDependable]: true },
    };
    const dependers = {
      [nodeKeyDependable]: { [nodeKeyDepender]: true },
      [nodeKeyDepender]: {},
    };

    const dep = new Dependency({
      dependencies: dependables,
      dependers: dependers,
    });

    expect(dep.dependsOn(nodeKeyDepender, nodeKeyDependable)).toBe(true);
  });

  test("Empty graph, then generating a new node without dependencies or dependents", () => {
    const nodeKey = "n1";
    const dep = new Dependency();
    const res = dep.addNode(nodeKey);
    expect(res === "ADDED" && dep.hasNodes()).toBe(true);
  });
});

describe("Testing combinations of add and remove node", () => {
  test("Empty graph, then generating a new node without dependencies or dependents, then removing it", () => {
    const nodeKey = "n1";
    const dep = new Dependency();
    const res = dep.addNode(nodeKey);
    const resrm = dep.removeNode(nodeKey);
    expect(res === "ADDED" && resrm !== false && !dep.hasNodes()).toBe(true);
  });

  test("Empty graph, then generating a base node, and then a second node that depends on the first node", () => {
    const nodeKey = "n1";
    const dependerNodeKey = "n2";

    const dep = new Dependency();
    const res = dep.addNode(nodeKey);
    const resDepender = dep.addNode(dependerNodeKey, [nodeKey]);
    expect(
      res === "ADDED" &&
        resDepender === "ADDED" &&
        dep.getNumberOfNodes() === 2 &&
        dep.dependsOn(dependerNodeKey, nodeKey)
    ).toBe(true);
  });

  test("Empty graph, then generating a base node, and then a second node that depends on the first node, then removing node 1", () => {
    const nodeKey = "n1";
    const dependerNodeKey = "n2";

    const dep = new Dependency();
    const res = dep.addNode(nodeKey);
    const resDepender = dep.addNode(dependerNodeKey, [nodeKey]);
    const resrm = dep.removeNode(nodeKey);

    expect(
      res === "ADDED" &&
        resDepender === "ADDED" &&
        resrm.dependers.includes(dependerNodeKey) &&
        dep.getNumberOfNodes() === 1
    ).toBe(true);
  });
});

describe("Testing dependency relationships, between two nodes", () => {
  test("Node two depends on node one", () => {
    const nodeKeyDependable = "n1";
    const nodeKeyDepender = "n2";

    const dep = new Dependency();
    dep.addNode(nodeKeyDependable);
    dep.addNode(nodeKeyDepender, [nodeKeyDependable]);

    expect(dep.dependsOn(nodeKeyDepender, nodeKeyDependable)).toBe(true);
  });

  test("Node one does not depends on node two", () => {
    const nodeKeyDependable = "n1";
    const nodeKeyDepender = "n2";

    const dep = new Dependency();
    dep.addNode(nodeKeyDependable);
    dep.addNode(nodeKeyDepender, [nodeKeyDependable]);

    expect(dep.dependsOn(nodeKeyDependable, nodeKeyDepender)).toBe(false);
  });

  test("Node one is a depended by node two", () => {
    const nodeKeyDependable = "n1";
    const nodeKeyDepender = "n2";

    const dep = new Dependency();
    dep.addNode(nodeKeyDependable);
    dep.addNode(nodeKeyDepender, [nodeKeyDependable]);

    expect(dep.dependedBy(nodeKeyDependable, nodeKeyDepender)).toBe(true);
  });

  test("Node two is a not depended by node one", () => {
    const nodeKeyDependable = "n1";
    const nodeKeyDepender = "n2";

    const dep = new Dependency();
    dep.addNode(nodeKeyDependable);
    dep.addNode(nodeKeyDepender, [nodeKeyDependable]);

    expect(dep.dependedBy(nodeKeyDepender, nodeKeyDependable)).toBe(false);
  });
});

describe("Testing cycles", () => {
  test("Will make a cycle, two nodes, where root is trying to add the end as a dependency", () => {
    const nodeKeyRoot = "n1";
    const nodeKeyEnd = "n2";

    const dep = new Dependency();
    dep.addNode(nodeKeyRoot);
    dep.addNode(nodeKeyEnd, [nodeKeyRoot]);

    expect(dep.willMakeDependencyCycle(nodeKeyRoot, nodeKeyEnd)).toBe(true);
  });

  test("Will make a cycle, three nodes, where root is trying to add the end as a dependency", () => {
    const nodeKeyRoot = "n1";
    const nodeKeyMiddle = "n2";
    const nodeKeyEnd = "n3";

    const dep = new Dependency();
    dep.addNode(nodeKeyRoot);
    dep.addNode(nodeKeyMiddle, [nodeKeyRoot]);
    dep.addNode(nodeKeyEnd, [nodeKeyMiddle]);

    expect(dep.willMakeDependencyCycle(nodeKeyRoot, nodeKeyEnd)).toBe(true);
  });

  test("Will not make a cycle, two dependency associated nodes plus one unattached node that is being checked", () => {
    const nodeKeyRoot = "n1";
    const nodeKeyEnd = "n2";
    const nodeKeyUnattached = "n3";

    const dep = new Dependency();
    dep.addNode(nodeKeyRoot);
    dep.addNode(nodeKeyEnd, [nodeKeyRoot]);
    dep.addNode(nodeKeyUnattached, []);

    expect(dep.willMakeDependencyCycle(nodeKeyRoot, nodeKeyUnattached)).toBe(
      false
    );
  });
});

describe("Testing dependency management", () => {
  test("Add two nodes, then make one dependant on the other", () => {
    const nodeKeyRoot = "n1";
    const nodeKeyEnd = "n2";

    const dep = new Dependency();
    dep.addNode(nodeKeyRoot);
    dep.addNode(nodeKeyEnd);

    dep.addDependency(nodeKeyEnd, nodeKeyRoot);

    expect(
      dep.hasDependencies(nodeKeyEnd) &&
        dep.hasDependers(nodeKeyRoot) &&
        dep.dependsOn(nodeKeyEnd, nodeKeyRoot) &&
        dep.dependedBy(nodeKeyRoot, nodeKeyEnd)
    ).toBe(true);
  });

  test("Add two nodes, one dependent on the other, then remove dependency", () => {
    const nodeKeyRoot = "n1";
    const nodeKeyEnd = "n2";

    const dep = new Dependency();
    dep.addNode(nodeKeyRoot);
    dep.addNode(nodeKeyEnd, [nodeKeyRoot]);

    dep.removeDependency(nodeKeyEnd, nodeKeyRoot);

    expect(
      !dep.hasDependencies(nodeKeyEnd) &&
        !dep.hasDependers(nodeKeyRoot) &&
        !dep.dependsOn(nodeKeyEnd, nodeKeyRoot) &&
        !dep.dependedBy(nodeKeyRoot, nodeKeyEnd)
    ).toBe(true);
  });

  test("Add three nodes, one dependent on another other, then update dependencies for both to instead only be dependent on third.", () => {
    const nodeKeyRoot = "n1";
    const nodeKeyEnd = "n2";
    const nodeKeyExtra = "n3";

    const dep = new Dependency();
    dep.addNode(nodeKeyRoot);
    dep.addNode(nodeKeyEnd, [nodeKeyRoot]);
    dep.addNode(nodeKeyExtra);

    dep.updateDependencies(nodeKeyEnd, [nodeKeyExtra]);
    dep.updateDependencies(nodeKeyRoot, [nodeKeyExtra]);

    expect(
      !dep.hasDependers(nodeKeyRoot) &&
        !dep.dependsOn(nodeKeyEnd, nodeKeyRoot) &&
        !dep.dependedBy(nodeKeyRoot, nodeKeyEnd) &&
        dep.hasDependers(nodeKeyExtra) &&
        dep.dependedBy(nodeKeyExtra, nodeKeyRoot) &&
        dep.dependedBy(nodeKeyExtra, nodeKeyEnd)
    ).toBe(true);
  });
});
