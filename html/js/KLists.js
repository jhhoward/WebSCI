function kNewList(args) {
    var listAddr = new Reg(0, 0);
    var newList = SegManager.allocList(listAddr);
    Debug.log("KLists", "Created a list at address " + listAddr.toString());
    return listAddr;
}

function kFindKey(args) {
	var node_pos;
	var key = args[1];
	var list_pos = args[0];

    Debug.log("KLists", "Looking for key " + key.toString() + " in " + list_pos.toString());

	node_pos = SegManager.lookupList(list_pos).first;

	Debug.log("KLists", "First node at " + node_pos.toString());

	while (!node_pos.isNull()) {
		var n = SegManager.lookupNode(node_pos);
		if (n.key.equals(key)) {
			Debug.log("KLists", "Found key at " + node_pos.toString());
			return node_pos;
		}

		node_pos = n.succ;
		Debug.log("KLists", "NextNode at " + node_pos.toString());
	}

	Debug.log("KLists", "Looking for key without success");
	return new Reg(0, 0);
}

function kNewNode(args) {
	var nodeValue = args[0];
	// Some SCI32 games call this with 1 parameter (e.g. the demo of Phantasmagoria).
	// Set the key to be the same as the value in this case
	var nodeKey = (args.length == 2) ? args[1] : args[0];
	VM.state.acc = SegManager.newNode(nodeValue, nodeKey);

	Debug.log("KLists", "New nodeRef at " + VM.state.acc.toString() + " with node " + nodeKey);

	return VM.state.acc;
}

function addToFront(listRef, nodeRef) {
	var list = SegManager.lookupList(listRef);
	var newNode = SegManager.lookupNode(nodeRef);

	Debug.log("KLists", "Adding node " + nodeRef.toString() + " to end of list " + listRef.toString());

	if (newNode == null)
		Debug.error("Attempt to add non-node " + nodeRef.toString() + " to list at " + listRef.toString());

	newNode.pred = new Reg(0, 0);
	newNode.succ = list.first.clone();

	// Set node to be the first and last node if it's the only node of the list
	if (list.first.isNull())
		list.last = nodeRef.clone();
	else {
		var oldNode = SegManager.lookupNode(list.first);
		oldNode.pred = nodeRef.clone();
	}
	list.first = nodeRef.clone();
}

function addToEnd(listRef, nodeRef) {
	var list = SegManager.lookupList(listRef);
	var newNode = SegManager.lookupNode(nodeRef);

	Debug.log("KLists", "Adding node " + nodeRef.toString() + " to end of list " + listRef.toString());

	if (newNode == null)
		Debug.error("Attempt to add non-node " + nodeRef.toString() + " to list at " + listRef.toString());

	newNode.pred = list.last.clone();
	newNode.succ = new Reg(0, 0);

	// Set node to be the first and last node if it's the only node of the list
	if (list.last.isNull())
		list.first = nodeRef.clone();
	else {
		var old_n = SegManager.lookupNode(list.last);
		old_n.succ = nodeRef.clone();
	}
	list.last = nodeRef.clone();
}

function kAddToEnd(args) {
	addToEnd(args[0], args[1]);

	if (args.length == 3)
		SegManager.lookupNode(args[1]).key = args[2];

	return VM.state.acc;
}

function kAddToFront(args) {
	addToFront(args[0], args[1]);

	if (args.length == 3)
		SegManager.lookupNode(args[1]).key = args[2].clone();

	return VM.state.acc;
}

function kFirstNode(args) {
    if(args[0].isNull())
        return new Reg(0, 0);
        
    var list = SegManager.lookupList(args[0]);
    
    if(list != null) {
        return list.first.clone();
    }
    
    return new Reg(0, 0);
}

function kNextNode(args) {
    var n = SegManager.lookupNode(args[0]);
    return n.succ.clone();
}

function kNodeValue(args) {
    var n = SegManager.lookupNode(args[0]);

    if(n != null) {
        return n.value.clone();
    }
    else {
        return new Reg(0, 0);
    }
}

function kDeleteKey(args) {
	var node_pos = kFindKey(args);
	var n;
	var list = SegManager.lookupList(args[0]);

	if (node_pos.isNull())
		return new Reg(0, 0); // Signal failure

	n = SegManager.lookupNode(node_pos);
	if (list.first.equals(node_pos))
		list.first = n.succ.clone();
	if (list.last.equals(node_pos))
		list.last = n.pred.clone();

	if (!n.pred.isNull())
		SegManager.lookupNode(n.pred).succ = n.succ.clone();
	if (!n.succ.isNull())
		SegManager.lookupNode(n.succ).pred = n.pred.clone();

	// Erase references to the predecessor and successor nodes, as the game
	// scripts could reference the node itself again.
	// Happens in the intro of QFG1 and in Longbow, when exiting the cave.
	n.pred = new Reg(0, 0);
	n.succ = new Reg(0, 0);

	return new Reg(0, 1); // Signal success
}


function kDisposeList(args) {
    // Not need apparently
    return VM.state.acc;
}
