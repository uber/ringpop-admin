function safeParse(data) {
    try {
        return JSON.parse(data);
    } catch (e) {
        return null;
    }
}

module.exports = {
    safeParse: safeParse
};
