#pragma once

namespace realis::scene {

class SceneNode;


class SelectionSystem {
public:
  SelectionSystem() : m_selectedNode(nullptr) {}

  void setSelected(SceneNode *node) { m_selectedNode = node; }

  SceneNode *getSelected() const { return m_selectedNode; }

  void clearSelection() { m_selectedNode = nullptr; }

  bool isSelected(const SceneNode *node) const {
    return m_selectedNode == node;
  }

private:
  SceneNode *m_selectedNode;
};

} 