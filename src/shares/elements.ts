import { noQuote } from "@db-diagram/@extensions/strings";
import { binary } from "@db-diagram/@gen/binary/types_generated";
import icons from "@db-diagram/assets/icons";
import styles from "@db-diagram/assets/styles/style-dark.scss";
import { Base } from "@db-diagram/elements/base";
import {
    applyAttribute, getAttributeNumber, PathAttribute, TextAttribute, UseAttribute,
} from "@db-diagram/elements/utils/attributes";
import { Box } from "@db-diagram/elements/utils/box";
import { Field } from "@db-diagram/services/documents/field";

/**
 * add custom properties to hold visualization object. This field is only used
 * when database diagram is being used under a custom web component.
 */
declare global {
    interface SVGSVGElement {
        __visualization: Visualization;
    }
}

/**
 * Callback to execute code until dom is ready.
 * @param callBack callback function
 */
export const onDomReady = (callBack: () => void) => {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", callBack);
    } else {
        callBack();
    }
};

/**
 * Type alias callback
 */
type ElementCallback = <T extends SVGElement>(ele: T) => void;

/**
 * Padding data
 */
export interface Padding {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

/**
 * A share object providing access to share data that accelerate calculation
 * when create diagram element.
 */
export class Visualization {

    /**
     * Return singleton instance of Visualization.
     * @param root root native element of the diagram.
     */
    public static getInstance(root: HTMLElement | SVGSVGElement = document.documentElement): Visualization {
        if (root instanceof SVGSVGElement) {
            if (root.__visualization) { return root.__visualization; }

            const doc = this.findCustomRootElement(root);
            if (doc !== undefined) {
                if (!root.__visualization) {
                    root.__visualization = new Visualization(root as SVGSVGElement);
                    root.__visualization.doc = doc;
                    onDomReady(() => {
                        doc.appendChild(root.__visualization.shareSvg);
                        root.__visualization.updatePropertiesValue();
                    });
                }
                return root.__visualization;
            }
        }
        // use globals
        if (!Visualization.instance) {
            Visualization.instance = new Visualization(root);
            onDomReady(() => {
                Visualization.instance.doc = document;
                document.body.appendChild(Visualization.instance.shareSvg);
                Visualization.instance.updatePropertiesValue();
            });
        }
        return Visualization.instance;
    }

    /**
     * Create a reference use svg element.
     * @param id id of actual element
     * @param attr attribute to be apply to the use element.
     */
    public static createReferencePathIcon(id: string, attr?: PathAttribute): SVGUseElement {
        return applyAttribute(Base.createElement("use"), Object.assign({}, {
            href: `#${id}`,
        } as UseAttribute, attr));
    }

    /**
     * create root svg element.
     */
    public static createSvgRootElement(): SVGSVGElement {
        const svg = Base.createElement("svg");
        const attr = { class: `${styles.dbdg}`, width: "100%", height: "100%" };
        return applyAttribute(svg, attr);
    }

    /**
     * Find the parent web component element. If diagram did not use under a web component,
     * it will return undefined value.
     * @param node svg root diagram element.
     */
    public static findCustomRootElement(node: Node): Document | DocumentFragment | undefined {
        if (node.parentNode) {
            return this.findCustomRootElement(node.parentNode);
        } else if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            return node as DocumentFragment;
        } else {
            return undefined;
        }
    }

    private static instance: Visualization;

    private static tableTextPadding = { left: 6, right: 6, top: 8, bottom: 8 };
    private static tableFieldpadding = { left: 6, right: 6, top: 4, bottom: 4 };
    private static space = 20;

    private static getFieldKindSelector(field: Field): string {
        return field.kind !== undefined && field.kind !== binary.FieldKind.Normal ?
            binary.FieldKind[field.kind!].toLowerCase() : "name";
    }

    /** Return text padding that use for all text inside table. */
    public static get TableTextPadding(): Padding { return this.tableTextPadding; }
    /** Return field padding. The padding is adding space around the field element inside the table. */
    public static get TableFieldPadding(): Padding { return this.tableFieldpadding; }
    /** Return minimum space between field name and field type text. */
    public static get FieldNameTypeSpacing(): number { return this.space; }

    /** Return table header height */
    public get tableHeaderHeight(): number {
        if (this.headerHeight === 0) {
            this.headerHeight = this.getTableHeaderSize().height;
        }
        return this.headerHeight;
    }

    /** Return table footer height */
    public get tableFooterHeight(): number {
        if (this.footerHeight === 0) {
            this.footerHeight = this.getTableFooterSize().height;
        }
        return this.footerHeight;
    }

    /** Return table field height */
    public get tableFieldHeight(): number {
        if (this.fieldHeight === 0) {
            this.fieldHeight = this.getTableFieldSize().height;
        }
        return this.fieldHeight;
    }

    /** Return table field icons width */
    public get tableFieldIconWidth(): number {
        return this.fieldIconWidth;
    }

    // cache size of all svg icons use in the diagram
    private iconsSize: Map<string, Box> = new Map();
    private fieldHeight: number = 0;
    private headerHeight: number = 0;
    private footerHeight: number = 0;
    private fieldIconWidth: number = 0;

    private shareSvg: SVGSVGElement;
    private textElement: SVGTextElement;
    private root: HTMLElement | SVGSVGElement;
    private doc?: Document | DocumentFragment;

    private constructor(root: HTMLElement | SVGSVGElement) {
        this.root = root;
        this.shareSvg = Base.createElement("svg");
        this.textElement = this.shareSvg.appendChild(Base.createElement("text"));
        applyAttribute(this.shareSvg, {
            style: "position: absolute; z-index: -1; top: 0; left: 0; width: 1px; height: 1px",
            visibility: "hidden",
        });
    }

    /**
     * Return styles declaration object.
     */
    public getStylesDts() {
        return styles;
    }

    /**
     * Return icons declaration object.
     */
    public getIconsDts() {
        return icons;
    }

    /**
     * Update share properties value.
     */
    public updatePropertiesValue() {
        // compute all icon size
        Object.entries(icons).forEach((pair) => {
            try {
                if (typeof pair[1] === "string") {
                    const a = this.getIconsElementSize(pair[1], true);
                }
            } catch (e) {/*Ignore error here*/ }
        });
        // compute table element height
        this.headerHeight = this.getTableHeaderSize().height;
        this.footerHeight = this.getTableFooterSize().height;
        this.fieldHeight = this.getTableFieldSize().height;

        this.fieldIconWidth = this.iconsSize.get(icons.foriegnKeyIcon)!.editable()
            .extend(this.iconsSize.get(icons.uniqueKeyIcon)!, true)
            .extend(this.iconsSize.get(icons.primaryKeyIcon)!, true)
            .padding(Visualization.TableTextPadding, true).width;
    }

    /**
     * Get icon element size.
     * @param id icon id
     * @param force if true it force re-calculate icons size.
     */
    public getIconsElementSize(id: string, force: boolean = false, eleCb?: ElementCallback): Box {
        if (this.iconsSize.get(id) === undefined || force) {
            const ele = this.doc!.querySelector(`#${id}`) as SVGElement;
            if (!ele) { throw new Error(`Element id: ${id} not found.`); }
            if (ele.tagName === "symbol") {
                // TODO: compute with viewbox value, refx and refy. For now we relied on pre-compute or
                // pre-optimization when use custom icon.
                const svgRect = this.shareSvg.createSVGRect();
                svgRect.x = getAttributeNumber(ele, "x");
                svgRect.y = getAttributeNumber(ele, "x");
                svgRect.width = getAttributeNumber(ele, "width");
                svgRect.height = getAttributeNumber(ele, "height");
                this.iconsSize.set(id, new Box(svgRect));
            } else if (ele instanceof SVGGraphicsElement) {
                this.iconsSize.set(id, new Box(ele.getBBox()));
            } else {
                throw new Error(`Element id: ${id} is not a graphical element.`);
            }
            if (eleCb) { eleCb(ele); }
        }
        // create new object to avoid accidentially change value
        return this.iconsSize.get(id)!;
    }

    /**
     * Return table header size
     * @param tableName a string represent table name.
     * @param textOnly
     */
    public getTableHeaderSize(tableName: string = "DUMP", textOnly: boolean = false): Box {
        const textSize = this.measureText(tableName, {
            fontFamily: this.readOnlyElementStyle().getPropertyValue(styles.dbdgTableTitleFontFamily),
            fontSize: this.readOnlyElementStyle().getPropertyValue(styles.dbdgTableTitleFontSize),
            fontStyle: noQuote(this.readOnlyElementStyle().getPropertyValue(styles.dbdgTableTitleFontStyle)),
            fontWeight: noQuote(this.readOnlyElementStyle().getPropertyValue(styles.dbdgTableTitleFontWeight)),
        });
        if (textOnly) { return new Box(textSize); }
        return this.getIconsElementSize(icons.tableIcon).editable()
            .extend(textSize, true).padding(Visualization.TableTextPadding, true);
    }

    /**
     * Return table footer size. This size is include the padding around the text. Use `getTableFooterTextSize`
     * to get text footer height.
     * @param options table options.
     */
    public getTableFooterSize(engine: string = "Unknown"): Box {
        const engineSize = new Box(this.getTableFooterTextSize(engine)).editable();
        return engineSize.padding(Visualization.TableTextPadding, true);
    }

    /**
     * Return table footer text size.
     * @param text text to render in the footer.
     */
    public getTableFooterTextSize(text: string = "Footer"): SVGRect {
        return this.measureText(text, {
            fontFamily: this.readOnlyElementStyle().getPropertyValue(styles.dbdgTableFooterTextFontFamily),
            fontSize: this.readOnlyElementStyle().getPropertyValue(styles.dbdgTableFooterTextFontSize),
            fontStyle: noQuote(this.readOnlyElementStyle().getPropertyValue(styles.dbdgTableFooterTextFontStyle)),
            fontWeight: noQuote(this.readOnlyElementStyle().getPropertyValue(styles.dbdgTableFooterTextFontWeight)),
        });
    }

    /**
     * Return table field size. It is include the size of icon, text plus the padding space.
     */
    public getTableFieldSize(): Box {
        const field = { name: "Field", type: binary.DataType.Int } as Field;
        const size = this.getIconsElementSize(icons.primaryKeyIcon).editable();
        size.extend(this.getTableTextFieldVariableSize(field), true)
            .extend(this.getTableTextFieldTypeSize(field), true);
        field.kind = binary.FieldKind.Primary;
        size.extend(this.getIconsElementSize(icons.primaryKeyIcon), true);
        field.kind = binary.FieldKind.Foriegn;
        size.extend(this.getIconsElementSize(icons.foriegnKeyIcon), true);
        field.kind = binary.FieldKind.Unique;
        size.extend(this.getIconsElementSize(icons.uniqueKeyIcon), true);
        return size.padding(Visualization.TableFieldPadding, true);
    }

    /**
     * Return table field text size base the field options.
     * @param options field option
     */
    public getTableTextFieldVariableSize(field: Field): SVGRect {
        const fieldKind = Visualization.getFieldKindSelector(field);
        return this.measureText(field.name, {
            fontFamily: this.readOnlyElementStyle().getPropertyValue(`--dbdg-field-text-${fieldKind}-font-family`),
            fontSize: this.readOnlyElementStyle().getPropertyValue(`--dbdg-field-text-${fieldKind}-font-size`),
            fontStyle: this.readOnlyElementStyle().getPropertyValue(`--dbdg-field-text-${fieldKind}-font-style`),
            fontWeight: this.readOnlyElementStyle().getPropertyValue(`--dbdg-field-text-${fieldKind}-font-weight`),
        });
    }

    /**
     * Return table field text size of a string represent type of the field.
     * @param options field option
     */
    public getTableTextFieldTypeSize(field: Field): SVGRect {
        const typeRaw = binary.DataType[field.type].toUpperCase();
        return this.measureText(typeRaw, {
            fontFamily: this.readOnlyElementStyle().getPropertyValue(styles.dbdgFieldTextTypeFontFamily),
            fontSize: this.readOnlyElementStyle().getPropertyValue(styles.dbdgFieldTextTypeFontSize),
            fontStyle: noQuote(this.readOnlyElementStyle().getPropertyValue(styles.dbdgFieldTextTypeFontStyle)),
            fontWeight: noQuote(this.readOnlyElementStyle().getPropertyValue(styles.dbdgFieldTextTypeFontWeight)),
        });
    }

    /**
     * Return a readonly style declaration.
     */
    public readOnlyElementStyle(): CSSStyleDeclaration {
        if (this.doc instanceof DocumentFragment) {
            return getComputedStyle(this.doc!.ownerDocument!.documentElement);
        } else {
            return getComputedStyle(this.doc!.documentElement);
        }
    }

    /**
     * Return a writable style declaration.
     */
    public writableElementStyle(): CSSStyleDeclaration {
        if (this.doc instanceof DocumentFragment) {
            return this.doc!.ownerDocument!.documentElement.style;
        } else {
            return this.doc!.documentElement.style;
        }
    }

    /**
     * Measure the text size.
     * @param text string to be measured
     * @param attr text element's attribute
     */
    public measureText(text: string, attr: TextAttribute): SVGRect {
        const textEle = this.textElement;
        let box: SVGRect;
        try {
            textEle.nodeValue = text;
            textEle.textContent = text;
            box = applyAttribute(textEle, attr).getBBox();
            return box;
        } finally {
            const allAttr = textEle.attributes;
            for (let i = allAttr.length - 1; i >= 0; i--) {
                if (allAttr[i].textContent === "visibility") {
                    continue;
                }
                textEle.removeAttributeNode(allAttr[i]);
            }
        }
    }

}
