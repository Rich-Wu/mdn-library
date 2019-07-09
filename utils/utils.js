Date.prototype.getHTMLDate = function() {
  return this.getFullYear() + "-" + (this.getMonth() + 1).toString().padStart(2, "0") + "-" + (this.getDate() + 1).toString().padStart(2, "0");
};