const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const Team = require('./models/Team');
const Task = require('./models/Task');
const Project = require('./models/Project');
const Workspace = require('./models/Workspace');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  // Find all workspaces
  const workspaces = await Workspace.find();
  
  for (const workspace of workspaces) {
    // Get valid member IDs
    const validMemberIds = workspace.members.map(m => m.user.toString());
    
    // Clean up Teams
    const teams = await Team.find({ workspace: workspace._id });
    for (const team of teams) {
      const originalLength = team.members.length;
      team.members = team.members.filter(mId => validMemberIds.includes(mId.toString()));
      if (team.members.length !== originalLength) {
        await team.save();
        console.log(`Cleaned up team ${team.name}`);
      }
    }
  }

  console.log('Cleanup complete');
  process.exit();
}

run();
