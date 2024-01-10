import * as React from 'react';
import Select from 'react-select';
import { IGlobalNavProps } from "./IGlobalNavProps";
import { IGobalNavState } from "./IGlobalNavState";
import { SPFI, spfi, SPFx as spSPFx } from "@pnp/sp";
import "@pnp/sp/sites";
import "@pnp/sp/webs";
import "@pnp/sp/lists"
import "@pnp/sp/items"
import "@pnp/sp/files/web";
import "@pnp/sp/site-users";
import "@pnp/sp/profiles";
import "@pnp/sp/taxonomy";
import { dateAdd, PnPClientStorage } from "@pnp/common";
import { SiteBreadcrumb } from "@pnp/spfx-controls-react/lib/SiteBreadcrumb";
import { ContextualMenuItemType, updateA } from '@fluentui/react/lib/';
import { Breadcrumb, IBreadcrumbItem } from '@fluentui/react';
import { ContextualMenuItem, IContextualMenuItem } from 'office-ui-fabric-react';
import Helper from './Helper';

import { useCookies } from 'react-cookie';
import Cookies from 'universal-cookie';

import { SPComponentLoader } from '@microsoft/sp-loader';

import * as $ from "jquery";
import * as bootstrap from "bootstrap";
import { each } from 'jquery';
import { __positioningTestPackage } from '@fluentui/react/lib/utilities/positioning/positioning';
