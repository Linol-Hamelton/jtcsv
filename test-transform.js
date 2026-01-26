// test-transform.js
module.exports = function(row, index) {
  console.log(`Transforming row ${index}:`, row);
  return { ...row, transformed: true, index };
};