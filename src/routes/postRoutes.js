const express = require('express');
const { createPost,getPosts, getMyPost , postStatics , getPostDetail  , addComment} = require('../controllers/postController');
const router = express.Router();


router.post('/', createPost );
router.get('/', getPosts );
router.get('/me', getMyPost );
router.get('/statics', postStatics)
// detail post
router.get('/:id',  getPostDetail);
// comment post
router.post('/:id/comments', addComment);


module.exports = router;