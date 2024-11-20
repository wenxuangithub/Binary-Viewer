$(document).ready(function () {
    const ComparisonViewer = {
        bytesPerRow: 16,
        file1Content: null,
        file2Content: null,
        fileName1: '',
        fileName2: '',
        differences: [],

        init: function () {
            $('#uploadBtn1').on('click', () => $('#fileInput1').click());
            $('#uploadBtn2').on('click', () => $('#fileInput2').click());
            $('#fileInput1').on('change', (e) => this.handleFileUpload(e, 1));
            $('#fileInput2').on('change', (e) => this.handleFileUpload(e, 2));
            $('#compareBtn').on('click', () => this.compareFiles());
            $('#backBtn').on('click', () => window.location.href = 'index.html');

            // Sync scroll between the two ASCII viewers
            $('.viewer').on('scroll', function () {
                const viewerClass = $(this).attr('id');
                const scrollTop = $(this).scrollTop();
                const scrollLeft = $(this).scrollLeft();

                $('.viewer').not(`#${viewerClass}`).scrollTop(scrollTop);
                $('.viewer').not(`#${viewerClass}`).scrollLeft(scrollLeft);
            });
        },

        handleFileUpload: function (event, fileNum) {
            const file = event.target.files[0];
            if (!file) return;

            if (fileNum === 1) {
                this.fileName1 = file.name;
                $('#fileName1').text(this.fileName1);
                $('#fileInfo1').addClass('visible');
            } else {
                this.fileName2 = file.name;
                $('#fileName2').text(this.fileName2);
                $('#fileInfo2').addClass('visible');
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                if (fileNum === 1) {
                    this.file1Content = new Uint8Array(e.target.result);
                    this.renderFile();
                } else {
                    this.file2Content = new Uint8Array(e.target.result);
                    this.renderFile();
                }

                // Enable compare button if both files are loaded
                $('#compareBtn').prop('disabled', !(this.file1Content && this.file2Content));
            };
            reader.readAsArrayBuffer(file);
        },

        toAscii: function (num) {
            return (num >= 32 && num <= 126) ? String.fromCharCode(num) : '.';
        },

        renderFile: function () {
            const content1 = this.file1Content || [];
            const content2 = this.file2Content || [];
            const $asciiViewer1 = $('#asciiViewer1').empty();
            const $asciiViewer2 = $('#asciiViewer2').empty();

            const maxLength = Math.max(content1.length, content2.length);

            for (let offset = 0; offset < maxLength; offset += this.bytesPerRow) {
                const bytes1 = Array.from(content1.slice(offset, offset + this.bytesPerRow));
                const bytes2 = Array.from(content2.slice(offset, offset + this.bytesPerRow));

                const $asciiRow1 = $('<div>').addClass('row');
                const $asciiRow2 = $('<div>').addClass('row');

                // ASCII Viewer 1 (File 1)
                const $asciiContent1 = $('<div>').addClass('content');
                // ASCII Viewer 2 (File 2)
                const $asciiContent2 = $('<div>').addClass('content');

                bytes1.forEach((byte, idx) => {
                    const char1 = this.toAscii(byte);
                    const char2 = this.toAscii(bytes2[idx] || 0);
                    const isMatch = char1 === char2;

                    // ASCII view for File 1
                    $asciiContent1.append(
                        $('<span>')
                            .addClass(isMatch ? 'ascii-byte match' : 'ascii-byte diff')
                            .attr('data-offset', offset + idx)
                            .text(char1)
                    );

                    // ASCII view for File 2
                    $asciiContent2.append(
                        $('<span>')
                            .addClass(isMatch ? 'ascii-byte match' : 'ascii-byte diff')
                            .attr('data-offset', offset + idx)
                            .text(char2)
                    );
                });

                // Pad incomplete rows
                for (let i = bytes1.length; i < this.bytesPerRow; i++) {
                    $asciiContent1.append($('<span>').addClass('ascii-byte').text('.'));
                    $asciiContent2.append($('<span>').addClass('ascii-byte').text('.'));
                }

                $asciiRow1.append($asciiContent1);
                $asciiRow2.append($asciiContent2);

                $asciiViewer1.append($asciiRow1);
                $asciiViewer2.append($asciiRow2);
            }
        },

        compareFiles: function () {
            if (!this.file1Content || !this.file2Content) return;

            // Initialize or reset differences array
            this.differences = [];

            // Compare the lengths of both files
            const maxLength = Math.max(this.file1Content.length, this.file2Content.length);
            let chunkStart = -1;  // To group continuous differences together

            // Compare byte-by-byte and group consecutive differences
            for (let i = 0; i < maxLength; i++) {
                const byte1 = this.file1Content[i] || 0;
                const byte2 = this.file2Content[i] || 0;

                // Check if the current bytes are different
                if (byte1 !== byte2) {
                    if (chunkStart === -1) {
                        // Start a new chunk of differences
                        chunkStart = i;
                    }
                } else {
                    // End the current chunk of differences if any
                    if (chunkStart !== -1) {
                        this.differences.push({
                            chunkStart: chunkStart,
                            chunkEnd: i - 1,
                            chunkSize: i - chunkStart,
                            value1: this.file1Content.slice(chunkStart, i),
                            value2: this.file2Content.slice(chunkStart, i)
                        });
                        chunkStart = -1;
                    }
                }
            }

            // If the last chunk ends at the last byte
            if (chunkStart !== -1) {
                this.differences.push({
                    chunkStart: chunkStart,
                    chunkEnd: maxLength - 1,
                    chunkSize: maxLength - chunkStart,
                    value1: this.file1Content.slice(chunkStart),
                    value2: this.file2Content.slice(chunkStart)
                });
            }

            this.showFileStats();
            this.showDiffSummary();
        },

        showFileStats: function () {
            const file1Size = this.file1Content.length;
            const file2Size = this.file2Content.length;
            const totalDifferences = this.differences.length;

            // Display file stats in the UI
            $('#file1Stats').html(`
                <strong>File 1:</strong> ${file1Size} bytes
            `);
            $('#file2Stats').html(`
                <strong>File 2:</strong> ${file2Size} bytes
            `);
            $('#diffCount').text(`Total Differences: ${totalDifferences}`);
        },

        showDiffSummary: function () {
            const $diffList = $('#diffList').empty();

            // Loop through differences and show them in chunks
            this.differences.forEach(diff => {
                const chunkDisplay = `
                    <div class="diff-entry">
                        <strong>Chunk from offset ${diff.chunkStart.toString(16).toUpperCase()} to ${diff.chunkEnd.toString(16).toUpperCase()}</strong><br>
                        <strong>File1:</strong> ${this.toHexString(diff.value1)}<br>
                        <strong>File2:</strong> ${this.toHexString(diff.value2)}
                    </div>
                `;
                $diffList.append(chunkDisplay);
            });

            if (this.differences.length === 0) {
                $diffList.append('<div class="diff-entry">No differences found!</div>');
            }

            $('#diffSummary').show();
        },

        toHexString: function (byteArray) {
            return byteArray.map(byte => byte.toString(16).padStart(2, '0')).join(' ');
        },

    };

    ComparisonViewer.init();
});
