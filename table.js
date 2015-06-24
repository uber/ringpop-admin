var CliTable = require('cli-table');

function newTable(head) {
    return new CliTable({
        chars: {
            'bottom': '' ,
            'bottom-mid': '' ,
            'bottom-left': '' ,
            'bottom-right': '' ,
            'left': '' ,
            'left-mid': '' ,
            'mid': '' ,
            'mid-mid': '' ,
            'middle': ' ',
            'right': '' ,
            'right-mid': '' ,
            'top': '' ,
            'top-mid': '' ,
            'top-left': '' ,
            'top-right': '' ,
        },
        head: head
    });
}

module.exports = newTable;
