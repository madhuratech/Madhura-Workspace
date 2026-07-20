const mongoose = require('mongoose');
const { Schema } = mongoose;
const s = new Schema({ owner: Schema.Types.ObjectId, members: [{ user: Schema.Types.ObjectId }] });
const W = mongoose.model('W', s);
console.log(W.find({ $or: [{ owner: '5f641fbbc974f8c96' }, { 'members.user': '5f641fbbc974f8c96' }] }).getFilter());
