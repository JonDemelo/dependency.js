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
    const nodeKey = "m1";
    const dep = new Dependency();
    const res = dep.addNode(nodeKey);
    expect(res === "ADDED" && dep.hasNodes()).toBe(true);
  });

  test("Empty graph, then generating a new node without dependencies or dependents, then removing it", () => {
    const nodeKey = "m1";
    const dep = new Dependency();
    const res = dep.addNode(nodeKey);
    const resrm = dep.removeNode(nodeKey);
    expect(res === "ADDED" && resrm !== false && !dep.hasNodes()).toBe(true);
  });

  test("Empty graph, then generating a base node, and then a second node that depends on the first node", () => {
    const nodeKey = "m1";
    const dependerNodeKey = "m2";

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
    const nodeKey = "m1";
    const dependerNodeKey = "m2";

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

describe("Testing basic dependency relationships, loading two nodes", () => {
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
    const nodeKeyDependable = "m1";
    const nodeKeyDepender = "m2";

    const dep = new Dependency();
    dep.addNode(nodeKeyDependable);
    dep.addNode(nodeKeyDepender, [nodeKeyDependable]);

    expect(dep.dependedBy(nodeKeyDepender, nodeKeyDependable)).toBe(false);
  });
});
