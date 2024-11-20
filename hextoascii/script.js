$(document).ready(function() {
    $('#processFileBtn').on('click', function() {
        var fileInput = $('#fileInput')[0].files[0];
        if (!fileInput) {
            alert("Please upload a CSV file.");
            return;
        }

        var reader = new FileReader();
        reader.onload = function(event) {
            var fileContent = event.target.result;
            var parsedData = processHexCSV(fileContent);
            displayTables(parsedData.hexArray, parsedData.asciiArray);
        };

        reader.readAsText(fileInput);
    });

    function processHexCSV(csvContent) {
        var rows = csvContent.split('\n');
        var hexArray = [];
        var asciiArray = [];

        rows.forEach(function(row) {
            var hexArrayRow = row.split(/\t|,/).map(function(value) {
                return value.trim();
            }).filter(function(value) {
                return value !== '';
            });

            if (hexArrayRow.length > 0) {
                hexArray.push(hexArrayRow);
                var asciiRow = hexArrayRow.map(function(hexByte) {
                    return convertHexToAscii(hexByte);
                });
                asciiArray.push(asciiRow);
            }
        });

        return { hexArray: hexArray, asciiArray: asciiArray };
    }

    function convertHexToAscii(hexByte) {
        var decimal = parseInt(hexByte, 16);
        if (decimal >= 32 && decimal <= 126) {
            return String.fromCharCode(decimal); 
        } else {
            return '.';  // Non-printable characters replaced with '.'
        }
    }

    function displayTables(hexArray, asciiArray) {
        var hexTable = $('#hexTable');
        var asciiTable = $('#asciiTable');
        hexTable.empty(); // Clear previous table
        asciiTable.empty(); // Clear previous table

        var hexHeaderRow = $('<tr></tr>');
        var asciiHeaderRow = $('<tr></tr>');
        hexHeaderRow.append('<th>Hex Value</th>');
        asciiHeaderRow.append('<th>ASCII Value</th>');
        hexTable.append(hexHeaderRow);
        asciiTable.append(asciiHeaderRow);

        for (var i = 0; i < hexArray.length; i++) {
            var hexTableRow = $('<tr></tr>');
            var asciiTableRow = $('<tr></tr>');

            for (var j = 0; j < hexArray[i].length; j++) {
                hexTableRow.append('<td>' + hexArray[i][j] + '</td>');
                asciiTableRow.append('<td class="ascii-cell">' + asciiArray[i][j] + '</td>');
            }

            hexTable.append(hexTableRow);
            asciiTable.append(asciiTableRow);
        }

        // Click event for ASCII cells
        $('.ascii-cell').on('click', function() {
            var clickedChar = $(this).text();  // Get the character clicked
            highlightAndCount(clickedChar);
        });
    }

    function highlightAndCount(char) {
        // Clear existing highlights
        $('.ascii-cell').removeClass('highlight');

        var count = 0;
        var highlightedCells = [];

        // Loop through each cell and highlight it
        $('#asciiTable td').each(function(index, cell) {
            if ($(cell).text() === char) {
                count++;
                $(cell).addClass('highlight');
                highlightedCells.push(cell);
            }
        });

        // Display the count in the #characterCount div
        $('#characterCount').text('Character "' + char + '" has appeared ' + count + ' time(s) up to this point.').show();
    }
});
