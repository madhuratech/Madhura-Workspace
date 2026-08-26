const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const Project = require('./models/Project');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const project = await Project.findOne({ title: 'Ghouse' });
  if (project) {
    project.deliverables.push({
      stage: 'Proposal',
      link: 'https://figma.com/ghouse-proposal',
      fileUrl: '/uploads/mock-proposal.pdf',
      fileName: 'Proposal-Document.pdf',
      notes: 'Initial proposal for Ghouse project'
    });
    await project.save();
    console.log('Successfully injected deliverable');
  } else {
    console.log('Project Ghouse not found');
  }
  process.exit();
}

run();
