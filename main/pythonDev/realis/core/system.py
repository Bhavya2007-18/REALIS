
import numpy as np

class MainSystem:
    """
    The central container for the simulation system.
    Mirrors Exudyn's C++ MainSystem class.
    """
    def __init__(self):
        self.nodes = []
        self.objects = []
        self.loads = []
        self.sensors = []
        
        self.variables = {}
        self.system_state = None # Will hold the global state vector
        self.is_assembled = False
        
        # Link to factory (circular dependency handling usually done via linking)
        # For Python, we can just instantiate simple lists for now.

    def AddNode(self, node_dict):
        """
        Add a node to the system using a dictionary.
        This is the primary way users interact with the system.
        """
        # Ideally validation happens here or in the object itself
        # In Exudyn: MainObjectFactory::CreateMainNode -> adds to system
        from ..core.object_factory import ObjectFactory
        node = ObjectFactory.CreateNode(node_dict)
        self.nodes.append(node)
        self.is_assembled = False
        return len(self.nodes) - 1

    def AddObject(self, object_dict):
        """
        Add an object to the system using a dictionary.
        """
        from ..core.object_factory import ObjectFactory
        obj = ObjectFactory.CreateObject(object_dict)
        self.objects.append(obj)
        self.is_assembled = False
        return len(self.objects) - 1

    def Assemble(self):
        """
        Prepare the system for solving.
        - Assign global coordinates to nodes.
        - Check consistency.
        """
        if self.is_assembled:
            return

        # 1. Coordinate Mapping
        current_ode2_index = 0
        for node in self.nodes:
            # Assume all nodes derive from a base that has GetNumberOfCoordinates
             if hasattr(node, 'GetNumberOfCoordinates'):
                 n_coords = node.GetNumberOfCoordinates()
                 node.global_index = current_ode2_index
                 current_ode2_index += n_coords
        
        self.total_ode2_coordinates = current_ode2_index
        
        # Initialize global state vector
        # q = positions, q_t = velocities
        self.system_state = {
            'q': np.zeros(self.total_ode2_coordinates),
            'q_t': np.zeros(self.total_ode2_coordinates)
        }
        
        self.is_assembled = True
        print(f"System Assembled: {len(self.nodes)} nodes, {len(self.objects)} objects, {self.total_ode2_coordinates} coordinates.")

    def GetSystemState(self):
        """
        Return the current global state of the system.
        """
        if not self.is_assembled:
            raise RuntimeError("System not assembled!")
        return self.system_state

    def ComputeMassMatrix(self):
        """
        Compute the global mass matrix.
        """
        if not self.is_assembled:
            self.Assemble()
            
        n = self.total_ode2_coordinates
        M = np.zeros((n, n))
        
        for obj in self.objects:
            if hasattr(obj, 'ComputeMassMatrix'):
                # Object needs access to nodes to know where to put mass
                # This requires objects to store node indices
                obj.ComputeMassMatrix(M, self.nodes)
                
        return M

    def ComputeODE2RHS(self):
        """
        Compute the Right Hand Side (Forces).
        """
        if not self.is_assembled:
            self.Assemble()

        n = self.total_ode2_coordinates
        rhs = np.zeros(n)
        
        for obj in self.objects:
             if hasattr(obj, 'ComputeODE2RHS'):
        return rhs

    def GetGraphicsData(self):
        """
        Collect graphics data from all objects.
        """
        graphics_data = [] # List of dictionaries
        
        # Nodes usually don't verify visualization, but they could?
        # Objects verify visualization
        for obj in self.objects:
             if hasattr(obj, 'GetGraphicsData'):
                 g = obj.GetGraphicsData(self.nodes, self.system_state) # Pass state logic
                 if isinstance(g, list):
                     graphics_data.extend(g)
                 elif isinstance(g, dict):
                     graphics_data.append(g)
                     
        return graphics_data


