export const getPosts = async () => {
    `
    select post.*, author, myReactions, allReactions
    from posts;
    `;
};
