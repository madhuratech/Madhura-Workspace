const Project = require('../models/Project');
const Task = require('../models/Task');
const Workspace = require('../models/Workspace');

exports.globalSearch = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { q } = req.query;

    if (!q || q.trim() === '') {
      return res.status(200).json({ projects: [], tasks: [], members: [] });
    }

    const searchQuery = { $regex: q, $options: 'i' };

    // 1. Search Projects
    const projects = await Project.find({
      workspace: workspaceId,
      $or: [
        { name: searchQuery },
        { description: searchQuery }
      ]
    }).limit(5).select('name description status').lean();

    // 2. Search Tasks
    const tasks = await Task.find({
      workspace: workspaceId,
      title: searchQuery
    }).limit(5).select('title status priority').lean();

    // 3. Search Members (We need to populate from Workspace to filter by Name/Email)
    // Since Workspace stores member user refs, it's more efficient to search Users directly who are in the workspace
    const workspace = await Workspace.findById(workspaceId).populate({
      path: 'members.user',
      select: 'name email role',
      match: {
        $or: [
          { name: searchQuery },
          { email: searchQuery }
        ]
      }
    }).lean();

    let members = [];
    if (workspace && workspace.members) {
      members = workspace.members
        .filter(m => m.user !== null)
        .map(m => ({
          _id: m.user._id,
          name: m.user.name,
          email: m.user.email,
          role: m.role
        }))
        .slice(0, 5);
    }

    res.status(200).json({ projects, tasks, members });

  } catch (error) {
    console.error('Global search error:', error);
    res.status(500).json({ message: 'Server error during search' });
  }
};
