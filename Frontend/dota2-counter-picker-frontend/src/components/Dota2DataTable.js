import React, { useState } from "react";

function Dota2DataTable({ data }) {
    const [sortColumn, setSortColumn] = useState("Cumulative Advantage");
    const [sortDirection, setSortDirection] = useState("desc");

    if (!data || Object.keys(data).length === 0) {
        return <div>No data available</div>;
    }

    let columns = Object.keys(data);

    // Move "Cumulative Advantage" to second last position
    if (columns.includes("Cumulative Advantage")) {
        columns = [
            ...columns.filter(col => col !== "Cumulative Advantage"),
            "Cumulative Advantage",
        ];
    }

    // Move "Average Enemy WR" to last position
    if (columns.includes("Average Enemy WR")) {
        columns = [
            ...columns.filter(col => col !== "Average Enemy WR"),
            "Average Enemy WR",
        ];
    }

    // Sort the columns and rows based on the current sort column and direction
    try {
        const rows = Object.keys(data[columns[0]])
            .sort((a, b) => {
                const aValue = data[sortColumn][a];
                const bValue = data[sortColumn][b];
                if (aValue < bValue) {
                    return sortDirection === "asc" ? -1 : 1;
                } else if (aValue > bValue) {
                    return sortDirection === "asc" ? 1 : -1;
                } else {
                    return 0;
                }
            })
            .map(row => ({
                key: row,
                values: columns.map(col => data[col][row]),
            }));


        // Handle column click to update the sort column and direction
        const handleColumnClick = column => {
            if (column === sortColumn) {
                setSortDirection(sortDirection === "asc" ? "desc" : "asc");
            } else {
                setSortColumn(column);
                setSortDirection("desc");
            }
        };

        return (
            <table>
                <thead>
                    <tr>
                        <th></th>
                        {columns.map(col => (
                            <th
                                key={col}
                                onClick={() => handleColumnClick(col)}
                                style={{ cursor: "pointer" }}
                            >
                                {col}
                                {col === sortColumn && (
                                    <span>{sortDirection === "asc" ? "▲" : "▼"}</span>
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map(row => (
                        <tr key={row.key}>
                            <td>{row.key}</td>
                            {row.values.map((value, index) => (
                                <td key={index}>{typeof value === "number" ? value.toFixed(4) : value}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    } catch (error) {
        if (error instanceof TypeError && error.message.includes('Cannot read properties of undefined')) {
            setSortColumn("Cumulative Advantage");
        }
        else {
            return <h1>Something went wrong. Please refresh the page</h1>;
        }
    }
}

export default Dota2DataTable;