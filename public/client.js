// Selecting DOM Elements
const techTreeContainer = document.getElementById('techTree');
const doneTreeContainer = document.getElementById('doneTree');
const freeNodeContainer = document.getElementById('freeNodeContainer');
const waitingNodeContainer = document.getElementById('waitingNodeContainer');
const sidePanel = document.getElementById('sidePanel');
const resizeHandle = document.getElementById('resizeHandle');
const nodeNameInput = document.getElementById('nodeName');
const nodeImageInput = document.getElementById('nodeImage');
const nodeDescriptionInput = document.getElementById('nodeDescription');
const nodeWaitingCheckbox = document.getElementById('nodeWaiting');
const nodeHiddenCheckbox = document.getElementById('nodeHidden');
const nodeDoneCheckbox = document.getElementById('nodeDone');
const nodeJobCheckbox = document.getElementById('nodeJob'); // Added for 'job' status
const largeNodeImage = document.getElementById('largeNodeImage');
const saveNodeButton = document.getElementById('saveNodeButton');
const deleteNodeButton = document.getElementById('deleteNodeButton');
const techTreeTab = document.getElementById('techTreeTab');
const freeNodeTab = document.getElementById('freeNodeTab');
const waitingTab = document.getElementById('waitingTab');
const doneTreeTab = document.getElementById('doneTab');
const techTreeView = document.getElementById('techTree');
const doneTreeView = document.getElementById('doneTree');
const freeNodeViewDiv = document.getElementById('freeNode');
const waitingViewDiv = document.getElementById('waitingView');
const jobModeToggle = document.getElementById('jobModeToggle'); // Added for 'Job Mode' toggle

// State Variables
let currentNode = null; // Currently selected node
let isResizing = false; // Flag for resizing
let startX; // Starting X position for resizing
let startWidth; // Starting width for resizing
let cachedTechTreeData = []; // Cached Tech Tree data

// Configurable Spacing
const SPACING = 150; // Horizontal spacing between sibling nodes

// Define the ordered list of tab modes
const tabOrder = ['techTree', 'freeNode', 'waiting', 'doneTree'];

// Variables for Connection Handling
let isConnecting = false;
let connectionLine = null;
let sourceNodeId = null;

// Function to get tab and view elements
function getTabElement(mode) {
    const tabElements = {
        techTree: techTreeTab,
        freeNode: freeNodeTab,
        waiting: waitingTab,
        doneTree: doneTreeTab
    };
    return tabElements[mode];
}

function getViewElement(mode) {
    const viewElements = {
        techTree: techTreeView,
        freeNode: freeNodeViewDiv,
        waiting: waitingViewDiv,
        doneTree: doneTreeView
    };
    return viewElements[mode];
}

// Function to switch tabs
function switchTab(mode) {
    // Define the available modes
    const modes = ['techTree', 'freeNode', 'waiting', 'doneTree'];

    // Validate mode
    if (!modes.includes(mode)) {
        console.warn(`Invalid mode: ${mode}`);
        return;
    }

    // Define the mapping between mode and the render function
    const renderFunctions = {
        techTree: renderTechTreeView,
        freeNode: renderFreeNodes,
        waiting: renderWaitingNodes,
        doneTree: renderDoneTreeView
    };

    // Activate the selected tab and deactivate others
    modes.forEach(currentMode => {
        const tab = getTabElement(currentMode);
        if (tab) {
            if (currentMode === mode) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        }
    });

    // Activate the selected view and deactivate others
    modes.forEach(currentMode => {
        const view = getViewElement(currentMode);
        if (view) {
            if (currentMode === mode) {
                view.classList.add('activeView');
                view.classList.remove('inactiveView');
            } else {
                view.classList.add('inactiveView');
                view.classList.remove('activeView');
            }
        }
    });

    // Call the corresponding render function
    if (renderFunctions[mode]) {
        renderFunctions[mode]();
    }
}

// Event Listeners for Tabs
techTreeTab.addEventListener('click', () => switchTab('techTree'));
freeNodeTab.addEventListener('click', () => switchTab('freeNode'));
waitingTab.addEventListener('click', () => switchTab('waiting'));
doneTreeTab.addEventListener('click', () => switchTab('doneTree'));

// Resizing Functionality
function onMouseMove(e) {
    if (!isResizing) return;

    e.preventDefault(); // Prevent default behavior during resizing

    const dx = e.clientX - startX;
    let newWidth = startWidth + dx;

    // Enforce min and max widths from CSS
    const computedStyle = window.getComputedStyle(sidePanel);
    const minWidth = parseInt(computedStyle.minWidth);
    const maxWidth = parseInt(computedStyle.maxWidth);

    if (newWidth < minWidth) newWidth = minWidth;
    if (newWidth > maxWidth) newWidth = maxWidth;

    sidePanel.style.width = `${newWidth}px`;
}

function onMouseUp(e) {
    if (isResizing) {
        e.preventDefault(); // Prevent default behavior during resizing
        isResizing = false;
        document.body.style.cursor = 'default';

        // Remove event listeners to avoid affecting other interactions
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
}

// Mouse Down Event on Resize Handle
resizeHandle.addEventListener('mousedown', (e) => {
    e.preventDefault(); // Prevent text selection during resizing
    isResizing = true;
    startX = e.clientX;
    startWidth = sidePanel.offsetWidth;
    document.body.style.cursor = 'ew-resize';

    // Add event listeners for resizing
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
});

async function fetchTechTreeData() {
    try {
        const response = await fetch('/techTreeData');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Update the cached data
        cachedTechTreeData = data;

        // Update currentNode to reference the node in the new cachedTechTreeData
        if (currentNode) {
            const updatedNode = cachedTechTreeData.find(node => node.id === currentNode.id);
            if (updatedNode) {
                currentNode = updatedNode;
            } else {
                // The node might have been deleted; clear currentNode
                currentNode = null;
                clearSidePanel();
            }
        }

        return data;
    } catch (error) {
        console.error('Failed to fetch tech tree data:', error);
        return [];
    }
}

// Render View Function
async function renderView(viewType) {
    const techTreeData = await fetchTechTreeData();
    const container = getContainerByViewType(viewType);
    const filterFn = getFilterFunction(viewType);

    const filteredNodes = techTreeData.filter(filterFn);
    container.innerHTML = '';

    let options = {};
    if (viewType === 'techTree') {
        options.ignoreDoneDependencies = true;
    } else if (viewType === 'doneTree') {
        options.onlyIncludeDoneDependencies = true;
    }

    try {
        const levels = assignLevels(techTreeData, options);
        calculateNodePositions(techTreeData, levels, filteredNodes);
    } catch (error) {
        console.error(error.message);
        alert("Circular dependency detected! Please fix the dependencies.");
        return;
    }

    // Create and append node elements first
    filteredNodes.forEach(node => {
        createNode(node, viewType);
    });

    // Now adjust container size and draw lines if applicable
    if (viewType === 'techTree' || viewType === 'doneTree') {
        requestAnimationFrame(() => {
            adjustContainerSize(filteredNodes, container);
            drawLines(filteredNodes, container, techTreeData, options);
        });
    }
}

// Mapping between view types and containers
function getContainerByViewType(viewType) {
    const viewContainers = {
        techTree: techTreeContainer,
        doneTree: doneTreeContainer,
        freeNode: freeNodeContainer,
        waiting: waitingNodeContainer
    };
    return viewContainers[viewType];
}

// Define filter functions for each view type
function getFilterFunction(viewType) {
    switch(viewType) {
        case 'techTree':
            return node => !node.done;
        case 'doneTree':
            return node => node.done && !node.hidden;
        case 'freeNode':

            return node => {
                const baseCondition = node.dependencies.length === 0 && !node.waiting && !node.hidden && !node.done;
                const isJobMode = jobModeToggle.checked;
                const jobCondition = isJobMode ? node.job : !node.job;

                // Check visibility based on current day and time
                const now = new Date();
                const currentDay = now.getDay(); // 0 (Sunday) to 6 (Saturday)
                const currentMinutes = now.getHours() * 60 + now.getMinutes();

                // Day Visibility
                const dayVisible = !node.visibleDays || node.visibleDays.includes(currentDay);

                // Time Visibility
                let timeVisible = true;
                if (node.startTime !== undefined && node.endTime !== undefined && node.startTime !== null && node.endTime !== null) {
                    if (node.startTime <= node.endTime) {
                        // Normal case: Start time is before end time
                        timeVisible = currentMinutes >= node.startTime && currentMinutes <= node.endTime;
                    } else {
                        // Over midnight case: End time is on the next day
                        timeVisible = currentMinutes >= node.startTime || currentMinutes <= node.endTime;
                    }
                } else {
                    // If startTime or endTime is undefined/null, default to always visible
                    timeVisible = true;
                }

                return baseCondition && jobCondition && dayVisible && timeVisible;
            };
        case 'waiting':
            return node => node.dependencies.length === 0 && node.waiting && !node.hidden && !node.done;
        default:
            return () => false;
    }
}

// Render functions for each view
async function renderTechTreeView() {
    await renderView('techTree');
}

async function renderDoneTreeView() {
    await renderView('doneTree');
}

async function renderFreeNodes() {
    await renderView('freeNode');
}

async function renderWaitingNodes() {
    await renderView('waiting');
}

// Handle scroll and resize events for Tech Tree and Done Tree
function handleScroll() {
    const activeTab = document.querySelector('.tab.active');
    const currentMode = getModeFromActiveTab(activeTab);
    if (currentMode === 'techTree' || currentMode === 'doneTree') {
        drawLines(cachedTechTreeData.filter(getFilterFunction(currentMode)), getContainerByViewType(currentMode));
    }
}

function handleResize() {
    const activeTab = document.querySelector('.tab.active');
    const currentMode = getModeFromActiveTab(activeTab);
    if (currentMode === 'techTree' || currentMode === 'doneTree') {
        drawLines(cachedTechTreeData.filter(getFilterFunction(currentMode)), getContainerByViewType(currentMode));
    }
}

// Assign Levels Function
function assignLevels(techTreeData, options = {}) {
    const levels = {};
    const nodesMap = new Map();

    // Initialize nodes map for quick access
    techTreeData.forEach(node => {
        nodesMap.set(node.id, node);
    });

    // Function to compute level recursively with memoization
    function computeLevel(nodeId, visited = new Set()) {
        if (levels[nodeId] !== undefined) {
            return levels[nodeId];
        }

        // Detect circular dependencies
        if (visited.has(nodeId)) {
            throw new Error(`Circular dependency detected at node ${nodeId}`);
        }
        visited.add(nodeId);

        const node = nodesMap.get(nodeId);
        if (!node) {
            console.warn(`Node with ID ${nodeId} not found.`);
            return 0;
        }

        // Adjust dependencies based on options
        let dependencies = node.dependencies;

        if (options.ignoreDoneDependencies) {
            // Ignore dependencies on nodes that are done
            dependencies = dependencies.filter(depId => {
                const depNode = nodesMap.get(depId);
                return depNode && !depNode.done;
            });
        } else if (options.onlyIncludeDoneDependencies) {
            // Only include dependencies on nodes that are done
            dependencies = dependencies.filter(depId => {
                const depNode = nodesMap.get(depId);
                return depNode && depNode.done;
            });
        }

        if (dependencies.length === 0) {
            levels[nodeId] = 0;
            return 0;
        }

        // Compute the level based on adjusted dependencies
        let maxDepLevel = 0;
        for (const depId of dependencies) {
            const depLevel = computeLevel(depId, visited);
            if (depLevel + 1 > maxDepLevel) {
                maxDepLevel = depLevel + 1;
            }
        }

        levels[nodeId] = maxDepLevel;
        return maxDepLevel;
    }

    // Assign levels to all nodes
    techTreeData.forEach(node => {
        computeLevel(node.id);
    });

    return levels;
}

// Calculate Node Positions
function calculateNodePositions(techTreeData, levels, filteredNodes) {
    const levelGroups = {};
    const occupiedPositions = {}; // To track occupied X positions per level
    const MIN_HORIZONTAL_SPACING = 150; // Minimum spacing between nodes

    // Initialize levelGroups and occupiedPositions
    filteredNodes.forEach(node => {
        const level = levels[node.id];
        if (!levelGroups[level]) {
            levelGroups[level] = [];
            occupiedPositions[level] = [];
        }
        levelGroups[level].push(node);
    });

    // Sort levels in ascending order
    const sortedLevels = Object.keys(levelGroups).map(Number).sort((a, b) => a - b);

    // Position nodes based on levels
    sortedLevels.forEach(level => {
        const nodesAtLevel = levelGroups[level];

        if (level === 0) {
            // New logic for grouping level 0 nodes
            const groups = groupNodesByImmediateDependents(nodesAtLevel, techTreeData);

            let currentX = 0;
            groups.forEach(group => {
                // Position nodes within the group
                group.forEach(node => {
                    node.positionX = currentX;
                    node.positionY = level * 200; // Vertical spacing by level
                    occupiedPositions[level].push(node.positionX);
                    currentX += MIN_HORIZONTAL_SPACING;
                });
            });
        } else {
            nodesAtLevel.forEach(node => {
                // For nodes with dependencies, calculate average X position
                const depNodes = filteredNodes.filter(n => node.dependencies.includes(n.id));

                if (depNodes.length === 0) {
                    // If no dependencies within filteredNodes, treat similar to root node
                    node.positionX = occupiedPositions[level].length * MIN_HORIZONTAL_SPACING;
                } else {
                    // Calculate average X position of dependencies
                    const avgX = depNodes.reduce((sum, dep) => sum + dep.positionX, 0) / depNodes.length;
                    node.positionX = avgX;
                }

                node.positionY = level * 200; // Vertical spacing by level

                // Adjust X position to prevent overlapping only if necessary
                node.positionX = adjustPosition(level, node.positionX, occupiedPositions, MIN_HORIZONTAL_SPACING);
                occupiedPositions[level].push(node.positionX);
            });
        }
    });
}

function groupNodesByImmediateDependents(nodesAtLevel, techTreeData) {
    // Step 1: Map each node to its immediate dependents
    const nodeToDependents = new Map();
    nodesAtLevel.forEach(node => {
        const dependents = techTreeData.filter(n => n.dependencies.includes(node.id));
        nodeToDependents.set(node.id, dependents.map(dep => dep.id));
    });

    // Step 2: Build adjacency list based on shared dependents
    const adjacency = new Map();
    nodesAtLevel.forEach(node => {
        adjacency.set(node.id, new Set());
    });

    // Compare each pair of nodes to see if they share any dependents
    for (let i = 0; i < nodesAtLevel.length; i++) {
        for (let j = i + 1; j < nodesAtLevel.length; j++) {
            const nodeA = nodesAtLevel[i];
            const nodeB = nodesAtLevel[j];
            const dependentsA = nodeToDependents.get(nodeA.id);
            const dependentsB = nodeToDependents.get(nodeB.id);

            // Check for any shared dependents
            const sharedDependents = dependentsA.filter(dep => dependentsB.includes(dep));
            if (sharedDependents.length > 0) {
                adjacency.get(nodeA.id).add(nodeB.id);
                adjacency.get(nodeB.id).add(nodeA.id);
            }
        }
    }

    // Step 3: Find connected components using Depth-First Search (DFS)
    const groups = [];
    const visited = new Set();

    function dfs(currentId, group) {
        visited.add(currentId);
        group.push(currentId);
        adjacency.get(currentId).forEach(neighborId => {
            if (!visited.has(neighborId)) {
                dfs(neighborId, group);
            }
        });
    }

    nodesAtLevel.forEach(node => {
        if (!visited.has(node.id)) {
            const group = [];
            dfs(node.id, group);
            groups.push(group.map(id => nodesAtLevel.find(n => n.id === id)));
        }
    });

    // Step 4: Handle nodes with no dependents separately
    // These nodes are already included in the groups above, but if you want
    // to ensure nodes without dependents are placed towards the right,
    // you can sort the groups accordingly.

    return groups;
}

// Function to adjust node's X position to prevent overlapping
function adjustPosition(level, desiredX, occupiedPositions, minSpacing) {
    let adjustedX = desiredX;
    let offset = minSpacing;
    let direction = 1; // 1 for right, -1 for left

    while (isTooClose(adjustedX, occupiedPositions[level], minSpacing)) {
        // Alternate directions: right, left, right+minSpacing, left+minSpacing, etc.
        adjustedX += direction * offset;
        direction *= -1; // Switch direction

        // Increment offset for the next iteration to spread out further if needed
        offset += minSpacing / 2;

        // Safety check to prevent infinite loops
        if (offset > minSpacing * 10) {
            console.warn(`Could not find a suitable position for node at level ${level}.`);
            break;
        }
    }

    return adjustedX;
}

// Function to check if desired X position is too close to existing nodes
function isTooClose(x, occupiedX, minSpacing) {
    return occupiedX.some(existingX => Math.abs(existingX - x) < minSpacing);
}

// Adjust Container Size Function
function adjustContainerSize(filteredNodes, container) {
    let maxX = 0;
    let maxY = 0;
    filteredNodes.forEach(node => {
        const nodeElement = document.getElementById(node.id);
        if (nodeElement) {
            const nodeRight = node.positionX + nodeElement.offsetWidth;
            const nodeBottom = node.positionY + nodeElement.offsetHeight;
            if (nodeRight > maxX) {
                maxX = nodeRight;
            }
            if (nodeBottom > maxY) {
                maxY = nodeBottom;
            }
        }
    });
    // Dynamic Padding
    const padding = 100; // Adjust as needed

    // Apply size with constraints
    container.style.width = `${Math.max(maxX + padding, container.offsetWidth)}px`;
    container.style.height = `${Math.max(maxY + padding, container.offsetHeight)}px`;
}

// Function to Create a Node Element (with Connector)
function createNode(node, mode) {
    const nodeElement = document.createElement('div');
    nodeElement.classList.add('node');
    nodeElement.id = node.id;
    nodeElement.draggable = true; // Enable dragging

    // Add 'job-node' class if node is a job task
    if (node.job) {
        nodeElement.classList.add('job-node');
    }

    const img = document.createElement('img');
    img.src = node.img;
    img.alt = node.name;

    const title = document.createElement('p');
    title.textContent = node.name || "";

    nodeElement.appendChild(img);
    nodeElement.appendChild(title);

    if (mode === 'techTree' || mode === 'doneTree') {
        nodeElement.style.left = `${node.positionX}px`;
        nodeElement.style.top = `${node.positionY}px`;
        nodeElement.style.position = 'absolute';

        if (node.hidden) {
            nodeElement.classList.add('hidden');
        } else {
            nodeElement.classList.remove('hidden');
        }

        if (node.done) {
            nodeElement.classList.add('done');
        } else {
            nodeElement.classList.remove('done');
        }

        const connector = document.createElement('div');
        connector.classList.add('connector');
        connector.dataset.nodeId = node.id;

        connector.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            initiateConnection(e, node.id);
        });

        nodeElement.appendChild(connector);
    } else if (mode === 'freeNode' || mode === 'waiting') {
        nodeElement.style.position = 'static';
        nodeElement.style.left = '';
        nodeElement.style.top = '';
    }
    nodeElement.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (currentNode && currentNode.id !== node.id) {
            await saveCurrentNode();
        }
        // Ensure we have the node from cachedTechTreeData
        const nodeInCache = cachedTechTreeData.find(n => n.id === node.id);
        if (nodeInCache) {
            currentNode = nodeInCache;
            loadNodeToEdit(currentNode);
        } else {
            alert('Node not found in tech tree data.');
        }
    });


    nodeElement.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', node.id);
    });

    nodeElement.addEventListener('dragover', (e) => e.preventDefault());
    nodeElement.addEventListener('dragenter', () => nodeElement.classList.add('highlight'));
    nodeElement.addEventListener('dragleave', () => nodeElement.classList.remove('highlight'));
    nodeElement.addEventListener('drop', (e) => handleDrop(e, node.id));

    if (mode === 'techTree') {
        techTreeContainer.appendChild(nodeElement);
    } else if (mode === 'freeNode') {
        freeNodeContainer.appendChild(nodeElement);
    } else if (mode === 'waiting') {
        waitingNodeContainer.appendChild(nodeElement);
    } else if (mode === 'doneTree') {
        doneTreeContainer.appendChild(nodeElement);
    }
}

// Load node data into the side panel for editing
function loadNodeToEdit(node) {
    nodeNameInput.value = node.name;
    nodeImageInput.value = node.img;
    nodeDescriptionInput.value = node.description || "";
    largeNodeImage.src = node.img || "";
    nodeWaitingCheckbox.checked = node.waiting || false;
    nodeHiddenCheckbox.checked = node.hidden || false;
    nodeDoneCheckbox.checked = node.done || false;
    nodeJobCheckbox.checked = node.job || false; // Load 'job' status

    // Load visibleDays
    const dayCheckboxes = document.querySelectorAll('input[name="visibleDays"]');
    if (node.visibleDays && node.visibleDays.length > 0) {
        dayCheckboxes.forEach(checkbox => {
            checkbox.checked = node.visibleDays.includes(parseInt(checkbox.value));
        });
    } else {
        // If visibleDays is undefined or empty, check all days (visible on all days)
        dayCheckboxes.forEach(checkbox => {
            checkbox.checked = true;
        });
    }

    // Load startTime and endTime
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');

    if (node.startTime !== undefined && node.startTime !== null) {
        startTimeInput.value = minutesToTimeString(node.startTime);
    } else {
        startTimeInput.value = '00:00'; // Default to 12:00 AM
    }

    if (node.endTime !== undefined && node.endTime !== null) {
        endTimeInput.value = minutesToTimeString(node.endTime);
    } else {
        endTimeInput.value = '23:59'; // Default to 11:59 PM
    }
}
async function saveCurrentNode() {
    if (!currentNode) return;

    // Update currentNode properties based on the form inputs
    currentNode.name = nodeNameInput.value.trim() || "";
    currentNode.img = nodeImageInput.value.trim() || "/images/default.png";
    currentNode.description = nodeDescriptionInput.value.trim();
    currentNode.waiting = nodeWaitingCheckbox.checked;
    currentNode.hidden = nodeHiddenCheckbox.checked;
    currentNode.done = nodeDoneCheckbox.checked;
    currentNode.job = nodeJobCheckbox.checked; // Save 'job' status

    largeNodeImage.src = currentNode.img;

    // Save visibleDays
    const dayCheckboxes = document.querySelectorAll('input[name="visibleDays"]');
    const checkedDays = Array.from(dayCheckboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => parseInt(checkbox.value));

    if (checkedDays.length === 0 || checkedDays.length === 7) {
        // All days selected or no days selected: visible on all days
        currentNode.visibleDays = null;
    } else {
        currentNode.visibleDays = checkedDays;
    }

    // Save startTime and endTime
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');

    const startTime = timeStringToMinutes(startTimeInput.value);
    const endTime = timeStringToMinutes(endTimeInput.value);

    if (startTime !== null && endTime !== null) {
        currentNode.startTime = startTime;
        currentNode.endTime = endTime;
    } else {
        // If either time is invalid, default to full-day visibility
        currentNode.startTime = 0;      // 12:00 AM
        currentNode.endTime = 1439;     // 11:59 PM
    }

    // Since currentNode is the same object as in cachedTechTreeData, changes are already made
    await saveTechTreeData(cachedTechTreeData);
}



// Delete the currently selected node
async function deleteCurrentNode() {
    if (!currentNode) return;

    const confirmation = confirm("Are you sure you want to delete this node?");
    if (!confirmation) return;

    // Fetch the current tech tree data
    let techTreeData = await fetchTechTreeData();

    // Remove the current node
    techTreeData = techTreeData.filter(node => node.id !== currentNode.id);

    // Also remove the current node from other nodes' dependencies
    techTreeData.forEach(node => {
        node.dependencies = node.dependencies.filter(depId => depId !== currentNode.id);
    });

    await saveTechTreeData(techTreeData);

    // Clear the side panel
    currentNode = null;
    nodeNameInput.value = "";
    nodeImageInput.value = "";
    nodeDescriptionInput.value = "";
    nodeWaitingCheckbox.checked = false;
    nodeHiddenCheckbox.checked = false;
    nodeDoneCheckbox.checked = false;
    nodeJobCheckbox.checked = false; // Clear 'job' status
    largeNodeImage.src = "";
}

// Save tech tree data to the server
async function saveTechTreeData(data) {
    try {
        const response = await fetch('/techTreeData', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        cachedTechTreeData = data; // Update the cached data
        await initializeViews(); // Re-initialize all views to reflect changes
    } catch (error) {
        console.error('Failed to save tech tree data:', error);
    }
}

// Handle the drop event to add an image as a new dependency node
async function handleDrop(event, targetId) {
    event.preventDefault();

    const draggedNodeId = event.dataTransfer.getData('text/plain');

    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        const formData = new FormData();
        formData.append('image', file);

        try {
            const uploadResponse = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            if (!uploadResponse.ok) {
                throw new Error(`Image upload failed with status: ${uploadResponse.status}`);
            }

            const data = await uploadResponse.json();
            const newImagePath = data.imagePath;

            const newNodeId = `node${Date.now()}`;
            const newNode = {
                id: newNodeId,
                name: "",
                img: newImagePath,
                description: "",
                waiting: false,
                hidden: false,
                done: false,
                job: false, // Initialize 'job' status
                dependencies: []
            };

            const techTreeData = await fetchTechTreeData();

            techTreeData.push(newNode);

            const targetNode = techTreeData.find(node => node.id === targetId);
            if (targetNode) {
                if (!targetNode.dependencies.includes(newNodeId)) {
                    targetNode.dependencies.push(newNodeId);
                }
            } else {
                console.warn(`Target node with ID ${targetId} not found.`);
            }

            await saveTechTreeData(techTreeData);

            currentNode = newNode;
            loadNodeToEdit(currentNode);
        } catch (error) {
            console.error('Failed to handle drop event:', error);
            alert("Failed to upload image. Please try again.");
        }
    } else if (draggedNodeId) {
        // Handle node dragging (without image upload)
        if (draggedNodeId === targetId) {
            alert("Cannot make a node dependent on itself.");
            return;
        }

        const techTreeData = await fetchTechTreeData();

        const draggedNode = techTreeData.find(node => node.id === draggedNodeId);
        const targetNode = techTreeData.find(node => node.id === targetId);

        if (!draggedNode || !targetNode) {
            alert("Invalid nodes for dependency assignment.");
            return;
        }

        // Add dependency
        if (!targetNode.dependencies.includes(draggedNodeId)) {
            targetNode.dependencies.push(draggedNodeId);
        }

        await saveTechTreeData(techTreeData);
    } else {
        alert("Please drop an image file or a valid node.");
    }
}

// Handle image drop event for the side panel to replace current node's image
nodeImageInput.addEventListener('dragover', (e) => e.preventDefault());
nodeImageInput.addEventListener('drop', async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        const formData = new FormData();
        formData.append('image', file);

        try {
            // Upload image to the server
            const uploadResponse = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            if (!uploadResponse.ok) {
                throw new Error(`Image upload failed with status: ${uploadResponse.status}`);
            }

            const data = await uploadResponse.json();
            const newImagePath = data.imagePath; // Path to the uploaded image on the server

            // Update the current node's image
            nodeImageInput.value = newImagePath;
            largeNodeImage.src = newImagePath; // Update the large image preview
            if (currentNode) {
                currentNode.img = newImagePath;
                await saveCurrentNode();
            }
        } catch (error) {
            console.error('Failed to upload image:', error);
            alert("Failed to upload image. Please try again.");
        }
    } else {
        alert("Please drop an image file.");
    }
});

// Initiate Connection from Connector
function initiateConnection(e, nodeId) {
    e.preventDefault();
    isConnecting = true;
    sourceNodeId = nodeId;

    // Create an SVG line element for the temporary connection
    connectionLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    connectionLine.setAttribute('stroke', 'blue');
    connectionLine.setAttribute('stroke-width', '2');
    connectionLine.setAttribute('stroke-dasharray', '5,5'); // Dashed line for temporary connection

    // Append the line to a dedicated SVG layer
    let svg = document.querySelector('svg.connection-line');
    if (!svg) {
        svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.classList.add('connection-line');
        // Define arrow markers if desired
        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
        marker.setAttribute('id', 'arrow');
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '10');
        marker.setAttribute('refX', '10');
        marker.setAttribute('refY', '3');
        marker.setAttribute('orient', 'auto');
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute('d', 'M0,0 L0,6 L9,3 z'); // Arrow shape
        path.setAttribute('fill', '#000');
        marker.appendChild(path);
        defs.appendChild(marker);
        svg.appendChild(defs);
        techTreeContainer.appendChild(svg);
    }

    svg.appendChild(connectionLine);

    // Get initial position from the connector
    const sourceNodeElement = document.getElementById(nodeId);
    const connectorElement = sourceNodeElement.querySelector('.connector');
    const connectorRect = connectorElement.getBoundingClientRect();
    const containerRect = techTreeContainer.getBoundingClientRect();

    const startX = connectorRect.left - containerRect.left + connectorRect.width / 2;
    const startY = connectorRect.top - containerRect.top + connectorRect.height / 2;

    connectionLine.setAttribute('x1', startX);
    connectionLine.setAttribute('y1', startY);
    connectionLine.setAttribute('x2', startX);
    connectionLine.setAttribute('y2', startY);

    // Add event listeners for mouse movement and release
    document.addEventListener('mousemove', drawConnection);
    document.addEventListener('mouseup', finalizeConnection);
}

// Draw the temporary connection line following the cursor
function drawConnection(e) {
    if (!isConnecting || !connectionLine) return;

    const containerRect = techTreeContainer.getBoundingClientRect();
    const currentX = e.clientX - containerRect.left;
    const currentY = e.clientY - containerRect.top;

    connectionLine.setAttribute('x2', currentX);
    connectionLine.setAttribute('y2', currentY);
}

// Finalize the connection upon mouse release
async function finalizeConnection(e) {
    if (!isConnecting || !connectionLine) return;

    // Get the element under the cursor
    const containerRect = techTreeContainer.getBoundingClientRect();
    const dropX = e.clientX - containerRect.left;
    const dropY = e.clientY - containerRect.top;
    const elements = document.elementsFromPoint(e.clientX, e.clientY);
    let targetNodeId = null;

    for (const el of elements) {
        if (el.classList.contains('node') && el.id !== sourceNodeId) {
            targetNodeId = el.id;
            break;
        }
    }

    // Remove temporary line
    connectionLine.parentNode.removeChild(connectionLine);
    connectionLine = null;
    isConnecting = false;

    // Remove event listeners
    document.removeEventListener('mousemove', drawConnection);
    document.removeEventListener('mouseup', finalizeConnection);

    if (targetNodeId) {
        await saveCurrentNode();
        await establishDependency(sourceNodeId, targetNodeId);
    }

    sourceNodeId = null;
}

async function establishDependency(sourceId, targetId) {
    if (sourceId === targetId) {
        alert("A node cannot depend on itself.");
        return;
    }

    // Use cached data
    const techTreeData = cachedTechTreeData;

    const sourceNode = techTreeData.find(node => node.id === sourceId);
    const targetNode = techTreeData.find(node => node.id === targetId);

    if (!sourceNode || !targetNode) {
        alert("Invalid nodes selected for dependency.");
        return;
    }

    // Prevent duplicate dependencies
    if (targetNode.dependencies.includes(sourceId)) {
        alert("Dependency already exists.");
        return;
    }

    // Check for circular dependency
    if (createsCircularDependency(techTreeData, sourceId, targetId)) {
        alert("Cannot create circular dependencies.");
        return;
    }

    // Add dependency
    targetNode.dependencies.push(sourceId);

    // Save updated data
    await saveTechTreeData(techTreeData);
}


function createsCircularDependency(techTreeData, sourceId, targetId) {
    // Build the graph
    const graph = buildDependencyGraph(techTreeData);

    // Simulate adding the new dependency
    if (!graph[sourceId]) {
        graph[sourceId] = [];
    }
    graph[sourceId].push(targetId);

    // Check if there is a path from targetId back to sourceId
    const visited = new Set();

    function dfs(currentId) {
        if (currentId === sourceId) {
            return true;
        }
        if (visited.has(currentId)) {
            return false;
        }
        visited.add(currentId);
        const neighbors = graph[currentId] || [];
        for (const neighborId of neighbors) {
            if (dfs(neighborId)) {
                return true;
            }
        }
        return false;
    }

    return dfs(targetId);
}

function buildDependencyGraph(techTreeData) {
    const graph = {};
    techTreeData.forEach(node => {
        if (!graph[node.id]) {
            graph[node.id] = [];
        }
    });
    techTreeData.forEach(node => {
        node.dependencies.forEach(depId => {
            if (!graph[depId]) {
                graph[depId] = [];
            }
            graph[depId].push(node.id);
        });
    });
    return graph;
}


function getNodeName(nodeId) {
    const node = cachedTechTreeData.find(n => n.id === nodeId);
    return node ? node.name : 'Unknown Node';
}

// Function to Remove a Dependency Between Two Nodes
async function removeDependency(sourceId, targetId) {
    // Use cached data
    const techTreeData = cachedTechTreeData;

    // Find the target node
    const targetNode = techTreeData.find(node => node.id === targetId);
    if (!targetNode) {
        alert("Target node not found.");
        return;
    }

    // Remove the sourceId from the target node's dependencies
    const dependencyIndex = targetNode.dependencies.indexOf(sourceId);
    if (dependencyIndex > -1) {
        targetNode.dependencies.splice(dependencyIndex, 1);
    } else {
        alert("Dependency not found.");
        return;
    }

    // Save the updated tech tree data
    await saveTechTreeData(techTreeData);
}

function drawLines(filteredNodes, container, techTreeData, options) {
    // Remove any existing SVG elements within the container
    container.querySelectorAll('svg.connection-line').forEach(svg => svg.remove());

    // Create a new SVG element covering the entire content area
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add('connection-line');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none'; // Allow clicks to pass through
    svg.style.zIndex = '0'; // Ensure it's behind nodes

    // Define arrow marker
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
    marker.setAttribute('id', 'arrow');
    marker.setAttribute('markerWidth', '10');
    marker.setAttribute('markerHeight', '10');
    marker.setAttribute('refX', '10');
    marker.setAttribute('refY', '3');
    marker.setAttribute('orient', 'auto');
    const arrowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    arrowPath.setAttribute('d', 'M0,0 L0,6 L9,3 z'); // Arrow shape
    arrowPath.setAttribute('fill', '#000');
    marker.appendChild(arrowPath);
    defs.appendChild(marker);
    svg.appendChild(defs);

    // Append the SVG to the container before nodes
    container.insertBefore(svg, container.firstChild);

    // Draw lines between nodes based on dependencies
    filteredNodes.forEach(node => {
        // Adjust dependencies based on options
        let dependencies = node.dependencies;

        if (options.ignoreDoneDependencies) {
            // Ignore dependencies on nodes that are done
            dependencies = dependencies.filter(depId => {
                const depNode = techTreeData.find(n => n.id === depId);
                return depNode && !depNode.done;
            });
        } else if (options.onlyIncludeDoneDependencies) {
            // Only include dependencies on nodes that are done
            dependencies = dependencies.filter(depId => {
                const depNode = techTreeData.find(n => n.id === depId);
                return depNode && depNode.done;
            });
        }

        dependencies.forEach(depId => {
            const fromNode = document.getElementById(depId);
            const toNode = document.getElementById(node.id);

            if (fromNode && toNode) {
                // Get positions relative to the container
                const fromRect = fromNode.getBoundingClientRect();
                const toRect = toNode.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();

                // Calculate positions relative to the SVG coordinate system
                const fromX = fromRect.left - containerRect.left + fromNode.offsetWidth / 2;
                const fromY = fromRect.top - containerRect.top + fromNode.offsetHeight;
                const toX = toRect.left - containerRect.left + toNode.offsetWidth / 2;
                const toY = toRect.top - containerRect.top;

                // Create an SVG line
                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute('x1', fromX);
                line.setAttribute('y1', fromY);
                line.setAttribute('x2', toX);
                line.setAttribute('y2', toY);
                line.setAttribute('stroke', 'black');
                line.setAttribute('stroke-width', '2');
                line.setAttribute('marker-end', 'url(#arrow)'); // Add arrow marker
                line.classList.add('line');

                // Store source and target IDs as data attributes
                line.dataset.sourceId = depId;
                line.dataset.targetId = node.id;

                // Add event listener for click to remove dependency
                line.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent triggering other click events
                    const sourceId = e.target.dataset.sourceId;
                    const targetId = e.target.dataset.targetId;

                    // Confirm deletion
                    const confirmDeletion = confirm(`Remove dependency from "${getNodeName(sourceId)}" to "${getNodeName(targetId)}"?`);
                    if (confirmDeletion) {
                        removeDependency(sourceId, targetId);
                    }
                });

                svg.appendChild(line);
            }
        });
    });
}

// Initialize Views
async function initializeViews() {
    await renderTechTreeView();
    await renderFreeNodes();
    await renderWaitingNodes();
    await renderDoneTreeView();
}

// Initial Rendering
initializeViews();

// Event listeners for save and delete buttons
saveNodeButton.addEventListener('click', saveCurrentNode);
deleteNodeButton.addEventListener('click', deleteCurrentNode);

// Event listener for Job Mode toggle
jobModeToggle.addEventListener('change', renderFreeNodes);

// Function to get the mode from the active tab button's ID
function getModeFromActiveTab(activeTab) {
    // Assuming tab IDs are in the format 'techTreeTab', 'freeNodeTab', etc.
    if (!activeTab) return null;
    const id = activeTab.id;
    return id.replace('Tab', '');
}

// Event listener for keydown events to handle Page Up and Page Down
document.addEventListener('keydown', function(event) {
    // Check if Page Up or Page Down is pressed
    if (event.key === 'PageUp' || event.key === 'PageDown') {
        event.preventDefault(); // Prevent default scrolling behavior

        // Get the currently active tab button
        const activeTabButton = document.querySelector('.tab.active');
        const currentMode = getModeFromActiveTab(activeTabButton);

        if (!currentMode) return; // Exit if no active tab is found

        // Find the index of the current mode in the tab order
        const currentIndex = tabOrder.indexOf(currentMode);

        // Determine the new index based on the key pressed
        let newIndex;
        if (event.key === 'PageUp') {
            // Move to the previous tab; wrap around to the last tab if at the first
            newIndex = (currentIndex - 1 + tabOrder.length) % tabOrder.length;
        } else if (event.key === 'PageDown') {
            // Move to the next tab; wrap around to the first tab if at the last
            newIndex = (currentIndex + 1) % tabOrder.length;
        }

        // Get the new mode from the tab order
        const newMode = tabOrder[newIndex];

        // Call the existing switchTab function with the new mode
        switchTab(newMode);
    }
});

// Add dragover and drop event listeners to the techTreeContainer for background drops
techTreeContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    techTreeContainer.classList.add('drag-over'); // Optional: for visual feedback
});

techTreeContainer.addEventListener('dragleave', () => {
    techTreeContainer.classList.remove('drag-over');
});

techTreeContainer.addEventListener('drop', async (e) => {
    e.preventDefault();
    techTreeContainer.classList.remove('drag-over');

    // Check if the drop target is the techTreeContainer itself (background)
    if (e.target !== techTreeContainer) return; // Exit if dropped on a node

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        const formData = new FormData();
        formData.append('image', file);

        try {
            // Upload the image to the server
            const uploadResponse = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            if (!uploadResponse.ok) {
                throw new Error(`Image upload failed with status: ${uploadResponse.status}`);
            }

            const data = await uploadResponse.json();
            const newImagePath = data.imagePath; // Path to the uploaded image

            // Get drop coordinates relative to the techTreeContainer
            const rect = techTreeContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Create a new node object
            const newNodeId = `node${Date.now()}`;
            const newNode = {
                id: newNodeId,
                name: "",
                img: newImagePath,
                description: "",
                waiting: false,
                hidden: false,
                done: false,
                job: false, // Initialize 'job' status
                dependencies: [], // No dependencies
                positionX: x,
                positionY: y
            };

            // Fetch current tech tree data
            const techTreeData = await fetchTechTreeData();

            // Add the new node to the data
            techTreeData.push(newNode);

            // Save the updated tech tree data to the server
            await saveTechTreeData(techTreeData);

            // Optionally, select the new node for immediate editing
            currentNode = newNode;
            loadNodeToEdit(currentNode);
        } catch (error) {
            console.error('Failed to add new node:', error);
            alert("Failed to add new node. Please try again.");
        }
    } else {
        alert("Please drop an image file to create a new node.");
    }
});

async function handlePasteEvent(e) {
    // Do not handle paste if an input or textarea is focused
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        return;
    }

    // Prevent default paste behavior
    e.preventDefault();

    // Check if clipboard items are available
    if (e.clipboardData && e.clipboardData.items) {
        const items = e.clipboardData.items;
        let imageFile = null;

        // Loop through clipboard items to find an image
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                // Get the image file
                imageFile = items[i].getAsFile();
                break;
            }
        }

        if (imageFile) {
            // Upload the image to the server
            const formData = new FormData();
            formData.append('image', imageFile);

            try {
                // Upload the image
                const uploadResponse = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });

                if (!uploadResponse.ok) {
                    throw new Error(`Image upload failed with status: ${uploadResponse.status}`);
                }

                const data = await uploadResponse.json();
                const newImagePath = data.imagePath; // Path to the uploaded image on the server

                // Create a new node with the uploaded image
                const newNodeId = `node${Date.now()}`;
                const newNode = {
                    id: newNodeId,
                    name: "",
                    img: newImagePath,
                    description: "",
                    waiting: false,
                    hidden: false,
                    done: false,
                    job: false, // Initialize 'job' status
                    dependencies: [],
                    // Position the node at the center of the techTreeContainer
                    positionX: techTreeContainer.offsetWidth / 2,
                    positionY: techTreeContainer.offsetHeight / 2
                };

                // Fetch current tech tree data
                const techTreeData = await fetchTechTreeData();

                // Add the new node to the data
                techTreeData.push(newNode);

                // Save the updated tech tree data to the server
                await saveTechTreeData(techTreeData);

                // Optionally, select the new node for immediate editing
                currentNode = newNode;
                loadNodeToEdit(currentNode);

                // Switch to the appropriate view (e.g., Tech Tree or Free Nodes)
                switchTab('techTree'); // Or 'freeNode' if you prefer

                // Scroll to the new node (optional)
                const nodeElement = document.getElementById(newNodeId);
                if (nodeElement) {
                    nodeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            } catch (error) {
                console.error('Failed to handle pasted image:', error);
                alert("Failed to paste image. Please try again.");
            }
        } else {
            alert("No image data found in the clipboard.");
        }
    } else {
        alert("Clipboard data is not available.");
    }
}

document.addEventListener('paste', handlePasteEvent);

function timeStringToMinutes(timeString) {
    if (!timeString) return null;
    const [hrs, mins] = timeString.split(':').map(Number);
    if (isNaN(hrs) || isNaN(mins)) return null;
    return hrs * 60 + mins;
}


// Helper function to convert HH:MM format to minutes
function timeStringToMinutes(timeString) {
    if (!timeString) return null;
    const [hrs, mins] = timeString.split(':').map(Number);
    if (isNaN(hrs) || isNaN(mins)) return null;
    return hrs * 60 + mins;
}
function startPeriodicRefresh() {
    setInterval(() => {
        const activeTab = document.querySelector('.tab.active');
        const currentMode = getModeFromActiveTab(activeTab);
        if (currentMode === 'freeNode') {
            renderFreeNodes();
        }
    }, 60000); // Refresh every 1 minute
}

// Start the periodic refresh
startPeriodicRefresh();
