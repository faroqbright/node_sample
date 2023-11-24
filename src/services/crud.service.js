export default {
    createPDF(totalDeposits, headers, title, startingDate, endingDate, grandTotal) {
        let table = `
        <p style="text-align:center;">${startingDate} - ${endingDate}<span style="font-weight:bold;font-size:24px;margin-left:50px;margin-right:50px;">${title}</span>Total amount : $${grandTotal}</p>
        `
        table += "<table border='1' style='width:100%;word-break:break-word;'>";
        table += "<tr>";
        headers.map(item => {
            table += `<th >${item}</th>`;
        })
        table += "</tr>";

        totalDeposits.reverse().forEach(function (row, index) {
            table += "<tr>";
            table += "<td style='text-align:left;'>" + (index+1) + "</td>";
            table += "<td>" + row.name + "</td>";
            table += "<td>" + row.email + "</td>";
            table += "<td style='text-align:right;'>" + row.totalInLocal + "</td>";
            table += "<td style='text-align:right;'>" + row.totalInChecks + "</td>";
            table += "<td style='text-align:right;'>" + row.totalInFX + "</td>";
            table += "<td style='text-align:right;'>" + row.grandTotal + "</td>";
            table += "<td style='text-align:center;'>" + row.dateCreated + "</td>";
            table += "<td style='text-align:center;'>" + row.dateUpdated + "</td>";
            table += "</tr>";
        });
        table += "</table>";

        var options = {
            "format": "A4",
            "orientation": "landscape",
            "border": {
                "top": "0.1in",
            },
            "timeout": "120000"
        };
        return {
            table, options
        }
    }
}