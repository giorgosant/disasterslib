import React, {useState} from 'react';
import { GraphCanvas, lightTheme } from 'reagraph';
import { hazardsObj } from '../utils/constants';

const GraphView = ({ selectedPoint, setSelectedPoint, compareResults, relationships, distanceRange }) => {

  const [dynamicNodes, setDynamicNodes] = useState([]);
  const [dynamicEdges, setDynamicEdges] = useState([]);
  // This object maps a node id (string) to the IDs of the nodes and edges that were added when it was expanded.
  const [expandedNodes, setExpandedNodes] = useState({});

  if (!compareResults || compareResults.length === 0) {
    return <div>No data available for graph generation.</div>;
  }

  if (!selectedPoint) {
    return <div>Please select a disaster event to view its relationships.</div>;
  }

  const nodes = [];
  const edges = [];

  // Mapping long interrelation descriptions to short codes
  const interrelationMap = {
    "Increased likelihood of a secondary hazard to happen": "INCR",
    "Triggering relationship": "TRIG",
    "Compound hazards": "CH",
  };
  
  // Add the selected event as the central node
  nodes.push({
    id: selectedPoint.id.toString(),
    label: `${selectedPoint.elstatlektiko || 'N/A'}\n${selectedPoint.eventdate || 'N/A'}\n${hazardsObj[selectedPoint.disaster_type_en]}`,
    labelFontSize: 3,
    size: 7,
  });

  // Filter compareResults based on the distance range
  const filteredResults = compareResults.filter(
    (point) => point.distance_meters === null || point.distance_meters <= distanceRange
  );

  // Add connected nodes and edges using filtered results
  filteredResults.forEach((point) => {
    if (point.id !== selectedPoint.id) {
      // Collect applicable relationships for both cases
      const hazard1Relationships = relationships.filter(
        (rel) =>
          rel['Hazard1 (un_ref_title_en)'] === selectedPoint.disaster_type_en &&
          rel['Hazard2 (un_ref_title_en)'] === point.disaster_type_en &&
          point.days_difference >= 0
      );

      const hazard2Relationships = relationships.filter(
        (rel) =>
          rel['Hazard2 (un_ref_title_en)'] === selectedPoint.disaster_type_en &&
          rel['Hazard1 (un_ref_title_en)'] === point.disaster_type_en &&
          point.days_difference <= 0
      );

      if (hazard1Relationships.length > 0 || hazard2Relationships.length > 0) {
        nodes.push({
          id: point.id.toString(),
          label: `${point.elstatlektiko || 'N/A'}\n${point.eventdate || 'N/A'}\n${hazardsObj[point.disaster_type_en]}`,
          labelFontSize: 3,
          size: 4,
        });

        // Add edges for Hazard1 -> Hazard2 case
        if (hazard1Relationships.length > 0) {
          const edgeLabel = hazard1Relationships
            .map((rel) => interrelationMap[rel['Hazard_Interrelation']] || rel['Hazard_Interrelation']) // Use short version if available
            .join(', ');
          edges.push({
            id: `${selectedPoint.id}->${point.id}`,
            source: selectedPoint.id.toString(),
            target: point.id.toString(),
            label: edgeLabel, // Only short interrelation text
            size: 1,
          });
        }

        // Add edges for Hazard2 -> Hazard1 case
        if (hazard2Relationships.length > 0) {
          const edgeLabel = hazard2Relationships
            .map((rel) => interrelationMap[rel['Hazard_Interrelation']] || rel['Hazard_Interrelation']) // Use short version if available
            .join(', ');
          edges.push({
            id: `${point.id}->${selectedPoint.id}`,
            source: point.id.toString(),
            target: selectedPoint.id.toString(),
            label: edgeLabel, // Only short interrelation text
            size: 1,
          });
        }
      }
    }
  });

  const handleNodeClick = (nodeId) => {
    if (expandedNodes[nodeId]) {
      // ----- Collapse: Remove only those dynamic nodes/edges that are exclusively
      // added by this node's expansion, not used by any other expanded node.
      
      // Determine which dynamic node ids can be removed.
      const removeDynamicNodeIds = expandedNodes[nodeId].addedNodes.filter((dynNodeId) => {
        // Check all other expansions to see if they reference this dynamic node.
        let referencedElsewhere = false;
        Object.keys(expandedNodes).forEach((otherNodeId) => {
          if (otherNodeId !== nodeId) {
            if (expandedNodes[otherNodeId].addedNodes.includes(dynNodeId)) {
              referencedElsewhere = true;
            }
          }
        });
        return !referencedElsewhere;
      });
  
      // Similarly, determine which dynamic edge ids can be removed.
      const removeDynamicEdgeIds = expandedNodes[nodeId].addedEdges.filter((dynEdgeId) => {
        let referencedElsewhere = false;
        Object.keys(expandedNodes).forEach((otherNodeId) => {
          if (otherNodeId !== nodeId) {
            if (expandedNodes[otherNodeId].addedEdges.includes(dynEdgeId)) {
              referencedElsewhere = true;
            }
          }
        });
        return !referencedElsewhere;
      });
  
      // Remove only those nodes/edges from the dynamic arrays.
      setDynamicNodes((prevDynamicNodes) =>
        prevDynamicNodes.filter((n) => !removeDynamicNodeIds.includes(n.id))
      );
      setDynamicEdges((prevDynamicEdges) =>
        prevDynamicEdges.filter((e) => !removeDynamicEdgeIds.includes(e.id))
      );
      
      // Remove the expansion record for this node.
      setExpandedNodes((prevExpanded) => {
        const newExpanded = { ...prevExpanded };
        delete newExpanded[nodeId];
        return newExpanded;
      });
      
    } else {
      // ----- Expand: Compute any extra nodes and edges related to the clicked node -----
      const nodeData =
        nodeId === selectedPoint.id.toString()
          ? selectedPoint
          : filteredResults.find((p) => p.id.toString() === nodeId);
      if (!nodeData) return; // Safety check
  
      const newAddedNodes = [];
      const newAddedEdges = [];
  
      // Build a set of all node ids already visible (original + dynamic)
      const existingNodeIds = new Set([
        ...nodes.map((n) => n.id),
        ...dynamicNodes.map((n) => n.id),
      ]);
  
      // Build a set of all existing edge ids from your static edges and the current dynamic edges
      const existingEdgeIds = new Set([
        ...edges.map((e) => e.id),
        ...dynamicEdges.map((e) => e.id),
      ]);
  
      filteredResults.forEach((point) => {
        if (point.id.toString() === nodeId) return; // skip self
  
        // Apply the same filtering as before—but using nodeData as the “source” of relationships.
        const hazard1Relationships = relationships.filter(
          (rel) =>
            rel['Hazard1 (un_ref_title_en)'] === nodeData.disaster_type_en &&
            rel['Hazard2 (un_ref_title_en)'] === point.disaster_type_en &&
            point.days_difference >= 0
        );
        const hazard2Relationships = relationships.filter(
          (rel) =>
            rel['Hazard2 (un_ref_title_en)'] === nodeData.disaster_type_en &&
            rel['Hazard1 (un_ref_title_en)'] === point.disaster_type_en &&
            point.days_difference <= 0
        );
  
        if (hazard1Relationships.length > 0 || hazard2Relationships.length > 0) {
          // Add the node if it doesn't already exist.
          if (!existingNodeIds.has(point.id.toString())) {
            const newNode = {
              id: point.id.toString(),
              label: `${point.elstatlektiko || 'N/A'}\n${point.eventdate || 'N/A'}\n${hazardsObj[point.disaster_type_en]}`,
              labelFontSize: 3,
              size: 4,
            };
            newAddedNodes.push(newNode);
            existingNodeIds.add(point.id.toString());
          }
          // For hazard1Relationships: Create an edge from the clicked node to the other point.
          if (hazard1Relationships.length > 0) {
            const newEdgeId = `${nodeId}->${point.id}`;
            // Only add the edge if its ID isn't already present.
            if (!existingEdgeIds.has(newEdgeId)) {
              const edgeLabel = hazard1Relationships
                .map(
                  (rel) =>
                    interrelationMap[rel['Hazard_Interrelation']] ||
                    rel['Hazard_Interrelation']
                )
                .join(', ');
              newAddedEdges.push({
                id: newEdgeId,
                source: nodeId,
                target: point.id.toString(),
                label: edgeLabel,
                size: 1,
                labelFontSize: 3,
              });
              existingEdgeIds.add(newEdgeId);
            }
          }
          // For hazard2Relationships: Create an edge from the other point to the clicked node.
          if (hazard2Relationships.length > 0) {
            const newEdgeId = `${point.id}->${nodeId}`;
            if (!existingEdgeIds.has(newEdgeId)) {
              const edgeLabel = hazard2Relationships
                .map(
                  (rel) =>
                    interrelationMap[rel['Hazard_Interrelation']] ||
                    rel['Hazard_Interrelation']
                )
                .join(', ');
              newAddedEdges.push({
                id: newEdgeId,
                source: point.id.toString(),
                target: nodeId,
                label: edgeLabel,
                size: 1,
                labelFontSize: 3,
              });
              existingEdgeIds.add(newEdgeId);
            }
          }
        }
      });
  
      // If any extra nodes/edges were found, update state accordingly.
      if (newAddedNodes.length > 0 || newAddedEdges.length > 0) {
        setDynamicNodes((prev) => [...prev, ...newAddedNodes]);
        setDynamicEdges((prev) => [...prev, ...newAddedEdges]);
        setExpandedNodes((prev) => ({
          ...prev,
          [nodeId]: {
            addedNodes: newAddedNodes.map((n) => n.id),
            addedEdges: newAddedEdges.map((e) => e.id),
          },
        }));
      }
    }
  };

  const myTheme = {
    ...lightTheme,
    edge: {
      fill: '#D8E6EA',
    activeFill: '#1DE9AC',
    opacity: 1,
    selectedOpacity: 1,
    inactiveOpacity: 0.1,
    label: {
      stroke: '#fff',
      color: '#2A6475',
      activeColor: '#1DE9AC',
      fontSize: 2
    }
    }
  };


  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
      }}
    >
      {/* Graph Canvas */}
      <GraphCanvas
        theme={myTheme}
        labelType="all"
        draggable="true"
        edgeArrowPosition="end"
        edgeInterpolation="curved"
        edgeLabelPosition='above'
        cameraMode='pan'
        nodes={[...nodes, ...dynamicNodes]}
        edges={[...edges, ...dynamicEdges]}
        nodeLabels={(node) => node.label}
        edgeLabels={(edge) => edge.label}
        onNodeClick={(node) => handleNodeClick(node.id)} // Handle clicking nodes
        labelFontUrl={`${process.env.PUBLIC_URL}/fonts/NotoSans-Regular.ttf`}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default GraphView;