import { Component, AfterViewInit, Input } from '@angular/core';
import { ViewModel } from "../viewmodels.service";
import { ConfigService } from "../config.service";
import { Technique } from '../data.service';
import * as is from 'is_js';
declare var d3: any; //d3js

@Component({
    selector: 'exporter',
    templateUrl: './exporter.component.html',
    styleUrls: ['./exporter.component.scss']
})
export class ExporterComponent implements AfterViewInit {

    @Input() exportData: ExportData;

    svgDivName = "svgInsert_tmp"
    unitEnum = 0; //counter for unit change ui element
    constructor(private configService: ConfigService) { }

    ngAfterViewInit() {
        this.svgDivName = "svgInsert" + this.exportData.viewModel.uid;
        let self = this;
        this.exportData.filteredTechniques.forEach(function(technique: Technique) {
            if (self.exportData.viewModel.hasTechniqueVM(technique.technique_id)) {
                if (self.exportData.viewModel.getTechniqueVM(technique.technique_id).score != "") self.hasScores = true;
            }
        })
        //put at the end of the function queue so that the page can render before building the svg
        window.setTimeout(function() {self.buildSVG(self)}, 0)
    }

    //visibility of SVG parts
    //assess data in viewModel
    hasName(): boolean {return this.exportData.viewModel.name.length > 0}
    hasDescription(): boolean {return this.exportData.viewModel.description.length > 0}
    hasScores: boolean; //does the viewmodel have scores? built in ngAfterViewInit
    hasLegendItems(): boolean {return this.exportData.viewModel.legendItems.length > 0;}

    //above && user preferences
    showName(): boolean {return this.exportData.tableConfig.showName && this.hasName()}
    showDescription(): boolean {return this.exportData.tableConfig.showDescription && this.hasDescription()}
    showLayerInfo(): boolean {return this.showName() || this.showDescription()}
    showFilters(): boolean {return this.exportData.tableConfig.showFilters};
    showGradient(): boolean {return this.exportData.tableConfig.showGradient && this.hasScores;}
    showLegend(): boolean {return this.exportData.tableConfig.showLegend && this.hasLegendItems()}
    showLegendInHeader(): boolean {return this.exportData.tableConfig.legendDocked && this.showLegend();}

    buildSVG(self?): void {
        console.log("building SVG");
        if (!self) self = this; //in case we were called from somewhere other than ngViewInit

        //check preconditions, make sure they're in the right range
        let margin = {top: 5, right: 5, bottom: 5, left: 5};

        let width = Math.max(self.convertToPx(self.exportData.tableConfig.width, self.exportData.tableConfig.unit)  - (margin.right + margin.left), 10); console.log("width", width);
        let height = Math.max(self.convertToPx(self.exportData.tableConfig.height, self.exportData.tableConfig.unit) - (margin.top + margin.bottom), 10); console.log("height", height)
        let headerHeight = Math.max(self.convertToPx(self.exportData.tableConfig.headerHeight, self.exportData.tableConfig.unit), 1); console.log("headerHeight", headerHeight);

        let legendX = Math.max(self.convertToPx(self.exportData.tableConfig.legendX, self.exportData.tableConfig.unit), 0);
        let legendY = Math.max(self.convertToPx(self.exportData.tableConfig.legendY, self.exportData.tableConfig.unit), 0);
        let legendWidth = Math.max(self.convertToPx(self.exportData.tableConfig.legendWidth, self.exportData.tableConfig.unit), 10);
        let legendHeight = Math.max(self.convertToPx(self.exportData.tableConfig.legendHeight, self.exportData.tableConfig.unit), 10);

        let tableFontSize = Math.max(self.exportData.tableConfig.tableFontSize, 1); console.log('tableFontSize', tableFontSize)
        let tableTacticFontSize = Math.max(self.exportData.tableConfig.tableTacticFontSize, 1); console.log("tableTacticFontSize", tableTacticFontSize);
        let headerFontSize = Math.max(self.exportData.tableConfig.headerFontSize, 1); console.log("headerFontSize", headerFontSize)
        let headerLayerNameFontSize = Math.max(self.exportData.tableConfig.headerLayerNameFontSize, 1); console.log("headerLayerNameFontSize", headerLayerNameFontSize);
        let fontUnits = self.exportData.tableConfig.fontUnit;


        //remove previous graphic
        let element = <HTMLElement>document.getElementById(self.svgDivName);
        element.innerHTML = "";

        let svg = d3.select("#" + self.svgDivName).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .attr("xmlns", "http://www.w3.org/2000/svg")
            .attr("id", "svg" + self.exportData.viewModel.uid) //Tag for downloadSVG
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .style("font-family", self.exportData.tableConfig.font);
        let stroke_width = 1;
        // svg.append("rect")
        //     .attr("width", width - margin.right - stroke_width/2)
        //     .attr("height", height - margin.bottom - stroke_width/2)
        //     .style("stroke", "black")
        //     .style("stroke-width", stroke_width)
        //     .style("fill", "none")


        //  _  _ ___   _   ___  ___ ___
        // | || | __| /_\ |   \| __| _ \
        // | __ | _| / _ \| |) | _||   /
        // |_||_|___/_/ \_\___/|___|_|_\

        //count columns
        let numSections = 0;
        for (let i = 0; i < 4; i++) {
            let option = [self.showLayerInfo(), self.showFilters(), self.showGradient(), self.showLegendInHeader()][i];
            if (option) numSections++;
        }
        let headerSectionWidth = width/numSections;
        // console.log(numSections, headerSectionWidth)
        let header = null;
        let posX = 0; //row in the header
        let headerSectionTitleSep = (2 * (headerFontSize + 1))

        if (self.exportData.tableConfig.showHeader) {
            header = svg.append("g");
            header.append("rect")
                .attr("width", width)
                .attr("height", headerHeight)
                .style("stroke", "black")
                .style("stroke-width", stroke_width)
                .style("fill", "none")

            // layer name
            if (self.showLayerInfo()) {
                let layerAndDescPresent = (self.showName() && self.showDescription())
                let nameDescHeight = layerAndDescPresent ? headerHeight/2 : headerHeight
                let descY = layerAndDescPresent ? headerHeight/2 : 0

                if (self.showName()) { //layer name
                    let titleGroup = header.append("g")
                        .attr("transform", "translate(0,0)");
                    titleGroup.append("text")
                        .text(self.exportData.viewModel.name)
                        .attr("transform", "translate(2, " + (headerLayerNameFontSize + 1) +")")
                        .attr("dx", 0)
                        .attr("dy", 0)
                        .attr("font-size", headerLayerNameFontSize + fontUnits)
                        .attr("fill", "black")
                        .style("font-weight", "bold")
                        .call(self.wrap, (headerSectionWidth) - 4, nameDescHeight, self);
                        titleGroup.append("rect")
                            .attr("width", headerSectionWidth)
                            .attr("height", nameDescHeight)
                            .style("stroke-width", 1)
                            .style("stroke", "black")
                            .style("fill", "none");
                }

                if (self.showDescription()) {//description
                    let descriptionGroup = header.append("g")
                        .attr("transform", "translate(0," + descY + ")");
                    descriptionGroup.append("text")
                        .text(self.exportData.viewModel.description)
                        .attr("transform", "translate(2, " + (headerFontSize + 1) +")")
                        .attr("dx", 0)
                        .attr("dy", 0)
                        .attr("font-size", headerFontSize + fontUnits)
                        .attr("fill", "black")
                        .call(self.wrap, (headerSectionWidth) - 4, nameDescHeight, self);
                    descriptionGroup.append("rect")
                        .attr("width", headerSectionWidth)
                        .attr("height", nameDescHeight)
                        .style("stroke-width", 1)
                        .style("stroke", "black")
                        .style("fill", "none");
                }
                posX++;
            }

            if (self.showFilters()) {
                //filters
                let filtersGroup = header.append("g")
                    .attr("transform", "translate(" + (headerSectionWidth * posX) + ", 0)");
                filtersGroup.append("rect")
                    .attr("width", headerSectionWidth)
                    .attr("height", headerHeight)
                    .style("stroke-width", 1)
                    .style("stroke", "black")
                    .style("fill", "none");
                filtersGroup.append("text")
                    .text("filters")
                    .attr("transform", "translate(2, " + (headerFontSize + 1) +")")
                    .attr("dx", 0)
                    .attr("dy", 0)
                    .attr("font-size", headerFontSize + fontUnits)
                    .attr("fill", "black")
                    .style("font-weight", "bold");

                let filterTextGroup = filtersGroup.append("g")
                    .attr("transform", "translate(2," + (headerSectionTitleSep + 6) + ")");
                filterTextGroup.append("text")
                    .text(function() {
                        let t = "stages: "
                        let selection = self.exportData.viewModel.filters.stages.selection;
                        for (let i = 0; i < selection.length; i++) {
                            if (i != 0) t += ", ";
                            t += selection[i]
                        }
                        return t;
                    })
                    .attr("font-size", headerFontSize + fontUnits)
                    .attr("dominant-baseline", "middle");
                filterTextGroup.append("text")
                    .text(function() {
                        let t = "platforms: "
                        let selection = self.exportData.viewModel.filters.platforms.selection;
                        for (let i = 0; i < selection.length; i++) {
                            if (i != 0) t += ", "
                            t += selection[i]
                        }
                        return t;
                    })
                    .attr("font-size", headerFontSize + fontUnits)
                    .attr("dominant-baseline", "middle")
                    .attr("transform", "translate(0, " +(headerFontSize + 1) + ")");
                posX++
            }

            if (self.showGradient()) {
                //gradient
                let gradientGroup = header.append("g")
                    .attr("transform", "translate(" + (headerSectionWidth * posX) + ",0)");
                gradientGroup.append("rect")
                    .attr("width", headerSectionWidth)
                    .attr("height", headerHeight)
                    .style("stroke-width", 1)
                    .style("stroke", "black")
                    .style("fill", "none");
                gradientGroup.append("text")
                    .text("score gradient")
                    .attr("transform", "translate(2, " + (headerFontSize + 1) +")")
                    .attr("dx", 0)
                    .attr("dy", 0)
                    .attr("font-size", headerFontSize + fontUnits)
                    .attr("fill", "black")
                    .style("font-weight", "bold");
                posX++;

                let gradientContentGroup = gradientGroup.append("g")
                    .attr("transform", "translate(2," + headerSectionTitleSep + ")");

                let leftText = gradientContentGroup.append("text")
                    .text(self.exportData.viewModel.gradient.minValue)
                    .attr("transform", "translate(0, 6)")
                    .attr("font-size", headerFontSize + fontUnits)
                    .attr("dominant-baseline", "middle")



                //set up gradient to bind
                let svgDefs = svg.append('defs');
                let gradientElement = svgDefs.append("linearGradient")
                    .attr("id", "gradientElement");
                for (let i = 0; i < self.exportData.viewModel.gradient.gradientRGB.length; i++) {
                    let color = self.exportData.viewModel.gradient.gradientRGB[i];
                    gradientElement.append('stop')
                        .attr('offset', i/100)
                        .attr("stop-color", color.toHexString())
                    // console.log(color)
                }
                // console.log(gradientElement);
                let gradientDisplayLeft = (leftText.node().getComputedTextLength()) + 2;
                let gradientDisplay = gradientContentGroup.append("rect")
                    .attr("transform", "translate(" + gradientDisplayLeft + ", 0)")
                    .attr("width", 50)
                    .attr("height", 10)
                    .style("stroke-width", 1)
                    .style("stroke", "black")
                    .attr("fill", "url(#gradientElement)" ); //bind gradient

                gradientContentGroup.append("text")
                    .text(self.exportData.viewModel.gradient.maxValue)
                    .attr("transform", "translate(" + (gradientDisplayLeft + 50 + 2 ) + ", 6)")
                    .attr("font-size", headerFontSize + fontUnits)
                    .attr("dominant-baseline", "middle")

            }
            header.append("line")
                .attr("x1", 0)
                .attr("x2", width)
                .attr("y1", headerHeight)
                .attr("y2", headerHeight)
                .style("stroke", "black")
                .style("stroke-width", 3);



        } else { //no header
            headerHeight = 0
        }
        // console.log(showLegend, showLegendInHeader && self.exportData.tableConfig.legendDocked)
        if (self.showLegend() && !(!self.exportData.tableConfig.showHeader && self.exportData.tableConfig.legendDocked)) {
            console.log("building legend")
            //legend
            let legendGroup = self.showLegendInHeader() ? header.append("g")
                .attr("transform", "translate(" + (headerSectionWidth * posX) + ",0)")
                                             : svg.append("g")
                .attr("transform", "translate("+legendX+","+legendY+")");
            legendGroup.append("rect")
                .attr("width", self.showLegendInHeader() ? headerSectionWidth : legendWidth)
                .attr("height", self.showLegendInHeader() ? headerHeight : legendHeight)
                .style("stroke-width", 1)
                .style("stroke", "black")
                .style("fill", "none");
            legendGroup.append("text")
                .text("legend")
                .attr("transform", "translate(2, " + (headerFontSize + 1) +")")
                .attr("dx", 0)
                .attr("dy", 0)
                .attr("font-size", headerFontSize + fontUnits)
                .attr("fill", "black")
                .style("font-weight", "bold");;
            let legendItemHeight = self.showLegendInHeader() ? ((headerHeight - headerSectionTitleSep)/self.exportData.viewModel.legendItems.length) : ((legendHeight - headerSectionTitleSep)/self.exportData.viewModel.legendItems.length);
            let legendItemsGroup = legendGroup.selectAll("g")
                .data(self.exportData.viewModel.legendItems)
                .enter().append("g")
                .attr("transform", function(d,i) {
                    return "translate(2," + (headerSectionTitleSep + (legendItemHeight * i)) +")"
                });
            legendItemsGroup.append("text")
                .text(function(d) {return d.label})
                .attr("transform", "translate(12, 6)")
                .attr("dominant-baseline", "middle")
                .attr("font-size", headerFontSize + fontUnits)
                .attr("fill", "black")
                .attr("dx", 0)
                .attr("dy", 0)
                .call(self.wrap, (self.showLegendInHeader() ? headerSectionWidth : legendWidth - 14), 0, self);
            legendItemsGroup.append("rect")
                .attr("width", 10)
                .attr("height", 10)
                .style("stroke-width", 1)
                .style("stroke", "black")
                .style("fill", function(d) { return d.color });
            // posX++
        }


        //  _____ _   ___ _    ___   ___  ___  _____   __
        // |_   _/_\ | _ ) |  | __| | _ )/ _ \|   \ \ / /
        //   | |/ _ \| _ \ |__| _|  | _ \ (_) | |) \ V /
        //   |_/_/ \_\___/____|___| |___/\___/|___/ |_|

        let tablebody = svg.append("g")
            .attr("transform", "translate(0," + headerHeight + ")")


        //calculate cell height: the longest column decides the cell height
        let cellHeight = Number.MAX_VALUE;//Number.MAX_VALUE; //(height - margin.bottom - headerHeight)

        Object.keys(self.exportData.tactics).forEach(function(key: string) {
            let numVCells = (self.exportData.tactics[key].length) + 2 //extra two cells for the header
            let selfCellHeight = (height - headerHeight)/numVCells
            cellHeight = Math.min(cellHeight, selfCellHeight)
        });
        cellHeight = Math.max(cellHeight, 1) //must be positive number

        // columns
        let columnWidth = (width)/(self.exportData.orderedTactics.length)
        let columns = tablebody.selectAll("g")
            .data(self.exportData.orderedTactics).enter()
            .append("g")
            .attr("transform", function(d,i) {
                // console.log(d,i)
                return "translate(" + columnWidth * i + ", 0)"
            });

        // split columns into headers and bodies
        let colHeaderHeight = 2 * cellHeight;
        let columnHeaders = columns.append("g")
            .attr("transform", "translate(0,0)");
        columnHeaders.append("rect")
            .attr("width", columnWidth)
            .attr("height", 2 * cellHeight)
            .style("stroke", "black")
            .style("fill", "none")
        //split headers into name and count cells
        let headerTacticNames = columnHeaders.append("g")
        .attr("transform", "translate(0,0)")
        let headerTechniqueCounts = columnHeaders.append("g")
            .attr("transform", "translate(0,"+cellHeight+")")
        headerTacticNames.append("text")
            .text(function(d) {return self.toCamelCase(d.replace(/-/g," "))})
            .attr("font-size", tableTacticFontSize + fontUnits)
            .attr("transform", "translate(2, " + (tableTacticFontSize + 1) +")")
            .attr("dx", 0)
            .attr("dy", 0)
            .style("font-weight", "bold")
            .call(self.wrap, columnWidth - 2, cellHeight - 2, self)
        headerTechniqueCounts.append("text")
            .text(function(d) {
                return self.exportData.tactics[d].length + " items"
            })
            .attr("font-size", tableTacticFontSize + fontUnits)
            .attr("transform", "translate(1, " + (tableTacticFontSize + 1) +")")
            .attr("dx", 0)
            .attr("dy", 0)
            .call(self.wrap, columnWidth, cellHeight, self)

        let columnBodies = columns.append("g")
            .attr("transform", "translate(0,"+colHeaderHeight+")");

        let techniques = columnBodies.selectAll("g")
            .data(function(d) {
                // console.log(d)
                return self.exportData.tactics[d]
            }).enter().append("g")
                .attr("transform", function(d, i) {
                    return "translate(0," + i * cellHeight + ")"
                });


        techniques.append("rect")
            .attr("width", columnWidth)
            .attr("height", cellHeight)
            .style("stroke", "black")
            .style("fill", function(d) {
                if (!self.exportData.viewModel.hasTechniqueVM(d.technique_id)) return "white";
                let tvm = self.exportData.viewModel.getTechniqueVM(d.technique_id);
                if (tvm.color) return tvm.color
                if (tvm.score) return tvm.scoreColor
                return "none"
            });
        if (self.exportData.tableConfig.tableTextDisplay != "none") techniques.append("text")
            .text(function(d) {return self.exportData.tableConfig.tableTextDisplay == "name" ? d.name : d.technique_id})
            .attr("font-size", tableFontSize + fontUnits)
            .attr("transform", "translate(1, " + (tableFontSize + 1) +")")
            .attr("dx", 0)
            .attr("dy", 0)
            .call(self.wrap, columnWidth, cellHeight, self)

    }

    downloadSVG() {
        let svgEl = document.getElementById("svg" + this.exportData.viewModel.uid);
        svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        let svgData = new XMLSerializer().serializeToString(svgEl);
        // // var svgData = svgEl.outerHTML;
        // console.log(svgData)
        // let svgData2 = new XMLSerializer().serializeToString(svgEl);
        // console.log(svgData2)
        let filename = this.exportData.viewModel.name.split(' ').join('_');
        filename = filename.replace(/\W/g, "")  + ".svg"; // remove all non alphanumeric characters
        var preface = '<?xml version="1.0" standalone="no"?>\r\n';
        var svgBlob = new Blob([preface, svgData], {type:"image/svg+xml;charset=utf-8"});
        if (is.ie()) { //internet explorer
            window.navigator.msSaveBlob(svgBlob, filename)
        } else {
            var svgUrl = URL.createObjectURL(svgBlob);
            var downloadLink = document.createElement("a");
            downloadLink.href = svgUrl;
            downloadLink.download = filename
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        }

    }

    /**
     * Convert any length in various units to pixels
     * @param  quantity what length
     * @param  unit     which unit system (in, cm, px?)
     * @return          that length in pixels
     */
    convertToPx(quantity: number, unit: string): number {
        let factor;

        switch(unit) {
            case "in": {
                factor = 96
                break
            }
            case "cm": {
                factor = 3.779375 * 10;
                break;
            }
            case "px": {
                factor = 1;
                break;
            }
            case "em": {
                factor = 16;
                break;
            }
            case "pt": {
                factor = 1.33;
            }
            default: {
                console.error("unknown unit", unit)
                factor = 0;
            }
        }

        return quantity * factor;
    }

    // wrap(text, width, padding) {
    //     var self = d3.select(this),
    //     textLength = self.node().getComputedTextLength(),
    //     text = self.text();
    //     while (textLength > (width - 2 * padding) && text.length > 0) {
    //         text = text.slice(0, -1);
    //         self.text(text + '...');
    //         textLength = self.node().getComputedTextLength();
    //     }
    // }

    /**
     * wrap the given text svg element
     * @param  text       element to wrap
     * @param  width      width to wrap to
     * @param  cellheight stop appending wraps after this height
     * @param  self       reference to self this component because of call context
     */
    wrap(text, width, cellheight, self): void {
        text.each(function() {
            var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineHeight = 1.1, // ems
            y = text.attr("y"),
            dy = parseFloat(text.attr("dy")),
            tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(" "));
                if (tspan.node().getComputedTextLength() > width) {
                    line.pop();
                    tspan.text(line.join(" "));
                    line = [word];
                    let thisdy = lineHeight + dy
                    // if (self.convertToPx(thisdy, "em") > cellheight) return;
                    tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", thisdy + "em").text(word);
                }
            }
        });
    }

    // Capitalizes the first letter of each word in a string
    toCamelCase(str){
        return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    }

    //following two functions are only used for iterating over tableconfig options: remove when tableconfig options are hardcoded in html
    getKeys(obj) { return Object.keys(obj) }
    type(obj) { return typeof(obj) }

    /**
     * Return whether the given dropdown element would overflow the side of the page if aligned to the right of its anchor
     * @param  dropdown the DOM node of the panel
     * @return          true if it would overflow
     */
    checkalign(dropdown): boolean {
        // console.log(anchor)
        let anchor = dropdown.parentNode;
        return anchor.getBoundingClientRect().left + dropdown.getBoundingClientRect().width > document.body.clientWidth;
    }

}

export class ExportData {
    tableConfig: {
        width: number; //graphic width
        height: number; //graphic height
        unit: string; //units of width/height: px, cm, or in
        fontUnit: string; //units for font size: px or pt

        font: string; //font to use in the table
        tableFontSize: number; //size of font in table, in px
        tableTacticFontSize: number; // size of tactic names font, in px
        tableTextDisplay: string; //"name", "id" or "none"

        showHeader: boolean; //show or hide the header
        headerHeight: number; //height of header in unit
        headerFontSize: number; //size of font in header, in px
        headerLayerNameFontSize: number //size of layer name in header in px

        legendDocked: boolean; //dock the legend to the header
        legendX: number; //if undocked, where to place X
        legendY: number; //if undocked, where to place Y
        legendWidth: number; //if undocked, width of legend
        legendHeight: number; //if undocked, height of legend

        showLegend: boolean; //show or hide the legend
        showGradient: boolean; //show/hide the gradient in the header
        showFilters: true, //show/hide the filters in the header
        showDescription: true, //show/hide the description in the header
        showName: true //show/hide the layer name in the header
    }


    viewModel: ViewModel;
    tactics: object;
    orderedTactics: string[];
    filteredTechniques: Technique[];
    constructor(viewModel, tactics, orderedTactics, filteredTechniques: Technique[]) {
        this.viewModel = viewModel; this.tactics = tactics; this.filteredTechniques = filteredTechniques;
        this.orderedTactics = orderedTactics;
        this.tableConfig = {
            "width": 11,
            "height": 8.5,
            "headerHeight": 1,

            "unit": "in",
            "fontUnit": "pt",

            "font": 'sans-serif',
            "tableFontSize": 5,
            "tableTacticFontSize": 6,
            "tableTextDisplay": "name",

            "showHeader": true,
            "headerLayerNameFontSize": 18,
            "headerFontSize": 12,

            "legendDocked": true,
            "legendX": 0,
            "legendY": 0,
            "legendWidth": 2,
            "legendHeight": 2,

            "showLegend": true,
            "showGradient": true,
            "showFilters": true,
            "showDescription": true,
            "showName": true
        }

    }
}
