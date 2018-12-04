'use strict';

const fs = require('fs');

const walk = dir => {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const newFile = `${dir}/${file}`;
        const stat = fs.statSync(newFile);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(newFile));
        } else {
            results.push(newFile);
        }
    });
    return results;
};

module.exports = walk;
