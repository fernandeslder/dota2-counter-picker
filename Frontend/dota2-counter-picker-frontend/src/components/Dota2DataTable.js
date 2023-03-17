import React, { useState } from "react";
import "./Dota2DataTable.css";

function Dota2DataTable({ data }) {
    const [sortColumn, setSortColumn] = useState("Cumulative Advantage");
    const [sortDirection, setSortDirection] = useState("desc");

    if (!data || Object.keys(data).length === 0) {
        return (
            <div>Select Enemy Heroes</div>
        );
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
                                <div>
                                    <img src={`assets/img/${col}.jpg`} alt={col} />
                                </div>
                                {col}
                                {col === sortColumn && (
                                    <span>{sortDirection === "asc" ? "▲" : "▼"}</span>
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.filter(row => !columns.includes(row.key)).map(row => (
                        <tr key={row.key}>
                            <td>
                                <div>
                                    <img src={`assets/img/${row.key}.jpg`} alt={row.key} />
                                </div>
                                {row.key}
                            </td>
                            {row.values.map((value, index) => (
                                index === columns.indexOf("Average Enemy WR") &&
                                    typeof value === "number" ? (
                                    <td
                                        key={index}
                                        className={value < 50 ? "positive" : value > 50 ? "negative" : ""}
                                    >
                                        {value.toFixed(4)}
                                    </td>
                                ) : (
                                    <td
                                        key={index}
                                        className={value > 0 ? "positive" : value < 0 ? "negative" : ""}
                                    >
                                        {typeof value === "number" ? value.toFixed(4) : value}
                                    </td>
                                )
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