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


const cookies = new Cookies();
const ocbbreadmenu: string = 'ocb-breadmenu';
const ocbbreadmenuURL: string = 'pageURL';
const ocbcurrentlocation = 'ocb-current-location';
const ocbcurrentlang = 'ocb-current-lang';

let _selectedCountry: any = [];
let _selectedLang: any = [];
let _renderCount: number = 0;
let _rendered: boolean = false;
let _currentPageId: number = 0;
let _currentPageURL: string = '';
let _currentSiteUrl: string = '';
let _currentPageLanguage: string = ''
let _allOCBMenu: any = [2];
let _previusPageURL: string = '';
let langValue: any;
let strHome = 'Home';
let strOCBIntranetHome = 'OCB Intranet Home';

const customStyles = {
    control: (provided: Record<string, unknown>) => ({
        ...provided,
        height: 32,
        border: "0px",
        cursor: "pointer"
    }),
    option: (provided: Record<string, unknown>) => ({
        ...provided,
        "&:hover": {
            backgroundColor: "#cccccc82"
        }
    }),
};


const dataOptions = [
    {
        value: "en",
        text: "English",
        label: "English"
    },
    {
        value: "fr",
        text: "Français",
        label: "Français"
    }
];

const locations: any = [];

let sp: SPFI;
let checkUser: boolean = false;
const myKey: string = "navigationElements";

type MenuItemProps = {
    menuItem: any;
    itemType: ContextualMenuItemType;
    lang: string
};



const menuItems_FAST = React.memo((item: MenuItemProps) => {

    const labelLang = item.menuItem.labels.filter((k: any) => k.languageTag.indexOf(item.lang) !== -1);


    return (
        <div>
            {
                {
                    key: item.menuItem.id,
                    name: labelLang.length > 0 ? labelLang[0].name : item.menuItem.defaultLabel,
                    itemType: item.itemType,
                    href: (item.menuItem.localProperties !== undefined && item.menuItem.localProperties[0].properties !== undefined && item.menuItem.localProperties[0].properties.length > 0) ?
                        (item.menuItem.localProperties[0].properties.filter((x: any) => x.key === "_Sys_Nav_SimpleLinkUrl")[0] !== undefined && item.menuItem.localProperties[0].properties.filter((x: any) => x.key === "_Sys_Nav_SimpleLinkUrl")[0].value !== undefined) ? item.menuItem.localProperties[0].properties.filter((x: any) => x.key === "_Sys_Nav_SimpleLinkUrl")[0].value : null
                        : null,
                    subMenuProps: item.menuItem.children.length > 0 ?
                        { items: item.menuItem.children.map((i: any) => { return (menuItems_FAST(i)); }) }
                        : null,
                    isSubMenu: item.itemType !== ContextualMenuItemType.Header,
                    subHeader: (item.itemType !== ContextualMenuItemType.Header) ?
                        ((item.menuItem.localProperties !== undefined && item.menuItem.localProperties[0].properties !== undefined && item.menuItem.localProperties[0].properties.length > 0
                            && item.menuItem.children.length === 0)
                            ? ContextualMenuItemType.Normal
                            : ContextualMenuItemType.Divider)
                        : ContextualMenuItemType.Header
                }
            }
        </div>
    );

});




export default class GlobalNav extends React.Component<IGlobalNavProps, IGobalNavState> {
    private interval: any;
    private intervalLang: any;
    private store = new PnPClientStorage();
    constructor(props: IGlobalNavProps) {
        super(props);
        if ((navigator.userAgent.indexOf('Linux') !== -1 && navigator.userAgent.indexOf('wv') !== -1)
            || (navigator.userAgent.indexOf('iPhone') !== -1 && navigator.userAgent.indexOf('Safari') === -1)) {
            console.log("SharePoint APP");
            SPComponentLoader.loadCss('https://msfintl.sharepoint.com/:u:/r/sites/ocb-intranet/SiteAssets/intranet/css/ocbMenuMobile.css?v=1');
        } else {
            console.log("Browser");
            SPComponentLoader.loadCss('https://msfintl.sharepoint.com/:u:/r/sites/ocb-intranet/SiteAssets/intranet/css/ocbMenu.css?v=1');
        }

        this.state = {
            loading: false,
            terms: [],
            userLanguage: "en",
            selectedLanguage: [dataOptions[0]],
            htmlMenu: '',
            breadCrumb: [{
                key: 0,
                content: "",
                link: "",
                menuId: 0,
                headerId: 0,
                menuGuid: ""
            }],
            breadHTML: '',
        }

        _currentPageURL = this.props.wpcontext.pageContext.site.serverRequestPath;
        _currentPageId = this.props.wpcontext.pageContext.listItem !== undefined ? this.props.wpcontext.pageContext.listItem.id : 0;
        _currentSiteUrl = this.props.wpcontext.pageContext.site.absoluteUrl;


        this._setCurrentUserInfo();


        sp = spfi().using(spSPFx(this.props.wpcontext));

        this._getAllCountries();
        let _breadHTML = '';


        _allOCBMenu = this.state.breadCrumb;



        $(function () {

            // Call the function on load
            $(document).ready(function () {

                onMobileResize();
            });
            var alterClass = function () {

                var ww = document.body.clientWidth;
                if (ww < 991) {
                    $('#divBreadcrumb').removeClass('navbar');
                } else {
                    $('#divBreadcrumb').addClass('blue');
                };

            };
            $(window).resize(function () {

                onMobileResize();

                alterClass();

            });
            //Fire it when the page first loads:
            alterClass();


            const _resultCookie = getCookie(ocbbreadmenu);
            const _resultCookiePage = getCookie(ocbbreadmenuURL);

            const _currentResultCookie = getCookie('current' + ocbbreadmenu);
            const _currentResultCookiePage = getCookie('current' + ocbbreadmenuURL);


            if (_resultCookie !== undefined && _resultCookiePage !== null && window.location.href.indexOf(_resultCookiePage) !== -1) {

                console.log('Page URL ' + _resultCookiePage);
                $('#breadHTML').empty();
                $('#breadHTML').append(_resultCookie);

                document.cookie = 'current' + ocbbreadmenu + '=' + _resultCookie + ';path=/';
                document.cookie = 'current' + ocbbreadmenuURL + '=' + _resultCookiePage + ';path=/';

            } else if (_currentResultCookie !== undefined && _currentResultCookiePage !== null && window.location.href.indexOf(_currentResultCookiePage) !== -1) {
                console.log('Page URL ' + _resultCookiePage);
                $('#breadHTML').empty();
                $('#breadHTML').append(_currentResultCookie);
            }



            $(document).on('click', '.navbar-brand', function () {

                const _pageURL = $('.navbar-brand').attr('ocb-href');

                //redirectNewPage(_pageURL);

                redirectCorrectPage(_pageURL, true, null)


            });

            function onMobileResize() {

                if ($(window).width() > 991) {
                    $(document).on('click', '.nav-link', function () {
                        let _menuText = $(this)[0].innerText.trim();
                        let menuId: number = parseInt($(this).attr('menuindex'));
                        setBreadCrumb(_menuText, menuId, 0);
                    });
                } else {
                    $(document).on('dblclick', '.nav-link', function () {
                        let _menuText = $(this)[0].innerText.trim();
                        let menuId = parseInt($(this).attr('menuindex'));
                        setBreadCrumb(_menuText, menuId, 0);
                    });
                }
            }

            $(document).on('click', '.nav-item.directmenu > a', function () {
                debugger;
                let _menuText = $(this)[0].innerText.trim();
                let menuId: number = parseInt($(this).attr('menuindex'));
                setBreadCrumb(_menuText, menuId, 0);

            });


            $(document).on('click', '.dropdown-header', function () {

                let _menuText = $(this)[0].innerText.trim();
                let menuId: number = parseInt($(this).attr('menuindex'));

                setBreadCrumb(_menuText, menuId, 1);

            });

            $(document).on('click', '.dropdown-item', function () {

                let _menuText = $(this)[0].innerText.trim();
                let menuId: number = parseInt($(this).attr('menuindex'));

                setBreadCrumb(_menuText, menuId, 2);


            });

            function setBreadCrumb(_menuText: string, menuId: number, level: number) {


                $('#breadHTML').empty();

                const selectedLang: any = $('input[name=ddlLanguages1]').length > 0 ? $('input[name=ddlLanguages1]') : null;
                let choosedLang = '';
                if (selectedLang !== null)
                    choosedLang = selectedLang[0].value;


                let _allLinks: any = _allOCBMenu == null ? [] : _allOCBMenu[_allOCBMenu.length - 1];
                let _currentLink = _allLinks.filter((x: any) => x.menuId === menuId && x.content === _menuText)[0];

                const _headerId = _currentLink.headerId;

                let _subheader: any;
                if (_currentLink.key > 1)
                    _subheader = _allLinks.filter((x: any) => x.menuId === menuId && x.key === 1)[0];

                const _headerMenu = _allLinks.filter((x: any) => x.headerId === _headerId && x.key === 0)[0];
                let _headerLink = _headerMenu.link === null ? '#' : _headerMenu.link;
                let _subHeaderLink = (_subheader !== null && _subheader !== undefined && _subheader.content.length > 1 && _subheader.link !== null) ? _subheader.link : '#';
                let _homePage = 'https://msfintl.sharepoint.com/sites/ocb-intranet';

                if (choosedLang === 'fr') {
                    _headerLink = _headerMenu.frenchURL !== null ? _headerMenu.frenchURL : _headerLink;
                    _subHeaderLink = (_subHeaderLink.length>1 && _subheader.frenchURL !== null) ? _subheader.frenchURL : _subHeaderLink;
                    _homePage = 'https://msfintl.sharepoint.com/sites/ocb-intranet/_layouts/15/DocIdRedir.aspx?ID=ATA6V7EA5M2D-400264812-3321'
                }
                else if (choosedLang === 'nl') {
                    _headerLink = _headerMenu.dutchURL !== null ? _headerMenu.dutchURL : _headerLink;
                    _subHeaderLink = (_subHeaderLink.length>1 && _subheader.dutchURL !== null) ? _subheader.dutchURL : _subHeaderLink;

                }

                _breadHTML = '<li class="breadcrumb-item breadHome" id="brdHome" ocb-href="'+_homePage+'">' + strHome + '</li>';


                if (level !== 0) {
                    _breadHTML += '<li class="breadcrumb-item" ocb-href="' + _headerLink + '">' + _headerMenu.content + '</li>';
                }

                if (_subheader !== undefined && _subheader !== null && _subheader.content.length > 1) {
                    const _subLink = _subHeaderLink;
                    _breadHTML += '<li class="breadcrumb-item" ocb-href="' + _subLink + '">' + _subheader.content + '</li>';
                }


                _breadHTML += '<li class="breadcrumb-item active">' + _currentLink.content + '</li>';

                $('#breadHTML').empty();
                $('#breadHTML').append(_breadHTML);

                document.cookie = ocbbreadmenu + '=' + _breadHTML + ';path=/';
                document.cookie = ocbbreadmenuURL + '=' + _currentLink.link + ';path=/';

                //redirectNewPage(_currentLink.link);

                //for language selection... it's on testing proccess
                redirectCorrectPage(_currentLink, false, choosedLang)


            }

            $(document).on('click', '.ocb-breadcrumb.breadcrumb > .breadcrumb-item', function () {

                debugger;

                var _currentCrumb = $(this);
                let _countCrumb = $('.ocb-breadcrumb.breadcrumb > .breadcrumb-item').length;

                let _currentLink = '';

                _breadHTML = '';;
                let _homePage = 'https://msfintl.sharepoint.com/sites/ocb-intranet';
                const selectedLang: any = $('input[name=ddlLanguages1]');
                if (selectedLang[0].value==='fr')
                    _homePage = 'https://msfintl.sharepoint.com/sites/ocb-intranet/_layouts/15/DocIdRedir.aspx?ID=ATA6V7EA5M2D-400264812-3321';




                if (_countCrumb > 1) {
                    for (let index = 0; index < _countCrumb; index++) {

                        var _clickCrumb: any = $('.ocb-breadcrumb.breadcrumb > .breadcrumb-item')[index];

                        console.log(index + ' Bread ' + _clickCrumb);

                        if (_currentCrumb[0].innerText === _clickCrumb.innerText) {

                            console.log('Active ' + _currentCrumb);
                            _breadHTML += '<li class="breadcrumb-item active">' + _clickCrumb.innerText + '</li>';
                            _currentLink = _clickCrumb.attributes['ocb-href'].textContent; //_clickCrumb.attributes[1].textContent;
                            break;

                        } else {
                            _breadHTML += '<li class="breadcrumb-item" ocb-href="' + _clickCrumb.attributes['ocb-href'].textContent + '">' + _clickCrumb.innerText + '</li>';;
                        }

                    }

                } else {
                    _breadHTML = '<li class="breadcrumb-item breadHome" id="brdHome" ocb-href="'+_homePage+'">' + strHome + '</li>';
                    
                }

                $('#breadHTML').empty();
                $('#breadHTML').append(_breadHTML);

                document.cookie = ocbbreadmenu + '=' + _breadHTML + ';path=/';
                document.cookie = ocbbreadmenuURL + '=' + _currentLink + ';path=/';

               // redirectNewPage(_currentLink);

               redirectCorrectPage(_currentLink, true, null)



            });

            function redirectCorrectPage(_pageURL: any, _justUrl:boolean, _lang: string) {
                const selectedLang: any = $('input[name=ddlLanguages1]').length > 0 ? $('input[name=ddlLanguages1]') : null;
                let choosedLang = '';
                if (selectedLang !== null)
                    choosedLang = selectedLang[0].value;

                choosedLang = _lang!==null?_lang:choosedLang;

                let targetURL = (_pageURL.link !== null && !_justUrl) ? _pageURL.link : (_justUrl && _pageURL.length>1)?_pageURL: 'https://msfintl.sharepoint.com/sites/ocb-intranet';

                if (choosedLang === 'fr' && !_justUrl)
                    targetURL = _pageURL.frenchURL !== null ? _pageURL.frenchURL : targetURL;
                else if (choosedLang === 'nl' && !_justUrl)
                    targetURL = _pageURL.dutchURL !== null ? _pageURL.dutchURL : targetURL;


                let _originPath = '/sites/ocb-intranet/';

                if (window.location.pathname.toLocaleLowerCase().indexOf('/sitepages') !== -1)
                    _originPath = window.location.pathname.toLocaleLowerCase().split('/sitepages')[0] + '/';

                const _lowerLink = targetURL.toLocaleLowerCase()+ '/';

                if (_lowerLink.indexOf(_originPath.toLocaleLowerCase()) !== -1 || (_lowerLink === 'https://msfintl.sharepoint.com/sites/ocb-intranet/' && _originPath.toLocaleLowerCase() === '/sites/ocb-intranet/')) {
                    $('#redirectURL').attr('href', targetURL);

                    document.getElementById('redirectURL').click();


                } else
                    location.href = targetURL;

            }

            function redirectNewPage(_currentURL: string) {
                const selectedLang: any = $('input[name=ddlLanguages1]').length > 0 ? $('input[name=ddlLanguages1]') : null;
                let choosedLang = '';
                if (selectedLang !== null)
                    choosedLang = selectedLang[0].value;

                debugger;
                if (_currentURL === '')
                    _currentURL = 'https://msfintl.sharepoint.com/sites/ocb-intranet';

                if (_currentURL.indexOf('DocIdRedir.aspx?ID=') !== -1 && choosedLang.indexOf('en') === -1) { //?ID=P4MZ63RKAZPS-1796556758-106

                    const _docID = _currentURL.split('ID=')[1];

                    const _hlp = new Helper();

                    const _return = _hlp._getPageDetailsWithDocID(_docID.toString(), _currentSiteUrl, choosedLang);

                }

                let _originPath = '/sites/ocb-intranet/';

                if (window.location.pathname.toLocaleLowerCase().indexOf('/sitepages') !== -1)
                    _originPath = window.location.pathname.toLocaleLowerCase().split('/sitepages')[0] + '/';

                const _lowerLink = _currentURL.toLocaleLowerCase();

                if (_lowerLink.indexOf(_originPath.toLocaleLowerCase()) !== -1 || (_lowerLink === 'https://msfintl.sharepoint.com/sites/ocb-intranet' && _originPath.toLocaleLowerCase() === '/sites/ocb-intranet/')) {
                    $('#redirectURL').attr('href', _currentURL);

                    document.getElementById('redirectURL').click();
                } else
                    location.href = _currentURL;


            }


            function getCookie(cookieName: string) {
                const name = cookieName + "=";
                const cDecoded = decodeURIComponent(document.cookie);
                const cArr = cDecoded.split('; ');
                let res;
                cArr.forEach(val => {
                    if (val.indexOf(name) === 0) res = val.substring(name.length);
                })
                return res;
            }


        });

        if (_breadHTML.length > 1) {

            this.setState({
                breadHTML: _breadHTML
            })
        }


    }



    public componentDidMount() {

        if (this.state.terms.length > 0)
            return;

        const _cLang = cookies.get(ocbcurrentlang)

        langValue = this.state.selectedLanguage[0];

        if (_cLang !== undefined && _cLang[0].value !== 'en')
            langValue = _cLang[0];


        const selectionLang = dataOptions.filter(k => k.value === langValue.value).length > 0
            ? dataOptions.filter(x => x.value === langValue.value)[0]
            : dataOptions[0];

        console.log(`componentDidMount 1 ` + new Date());
        this.setState({
            userLanguage: langValue.value,
            selectedLanguage: [{
                label: selectionLang.label,
                value: selectionLang.value,
                text: selectionLang.text
            }]
        }, async () => {

            const cachedTermInfo = await this.store.local.getOrPut(myKey, () => {
                return sp.termStore.groups.getById('5e3f508c-c0fa-48cd-8e36-232a42bf4a1e').sets.getById('c65fb917-9ed2-41fa-a311-8bb85f98e46e').getAllChildrenAsOrderedTree({ retrieveProperties: true });
            }, dateAdd(new Date(), "minute", 10));
            if (cachedTermInfo.length > 0) {
                this.setState({ terms: cachedTermInfo });

            }
        });
        console.log(`componentDidMount 2 ` + new Date());

        document.addEventListener("DOMContentLoaded", () => {

            this._checkBreadCrumpsonNavigation();
        });



        return;
    }

    public componentWillUnMount() {

        clearInterval(this.interval);

    }


    public componentDidUpdate(prevProps: Readonly<IGlobalNavProps>, prevState: Readonly<IGobalNavState>, snapshot?: any): void {

        if (!_rendered)
            return


        $(function () {

            console.log('Menu Started');

            $(".nav-item.has-megamenu.dropdown").hover(
                function () {

                    handleDropdownEvent(this, true)
                /*   if ($(window).width() > 991) {
                        $('.dropdown-menu.megamenu', this).not('.in .dropdown-menu.megamenu').stop(true, false).slideDown("slow");
                        $('.dropdown-menu.megamenu', this).addClass('show');


                        $(this).toggleClass('open');
                    } */
                },
                function () {
                    handleDropdownEvent(this, false);
                   /* if ($(window).width() > 991) {
                        $('.dropdown-menu.megamenu', this).not('.in .dropdown-menu.megamenu').stop(true, false).slideUp("slow");
                        $('.dropdown-menu.megamenu', this).removeClass('show');

                        $(this).toggleClass('open');
                    }*/
                },
            )
            function handleDropdownEvent(element:any, isHoverIn:boolean) {
                if ($(window).width() > 991) {
                    var $dropdownMenu = $('.dropdown-menu.megamenu', element).not('.in .dropdown-menu.megamenu');
                    if (isHoverIn) {
                        $dropdownMenu.stop(true, false).slideDown("slow").addClass('show');
                    } else {
                        $dropdownMenu.stop(true, false).slideUp("slow").removeClass('show');
                    }
            
                    $(element).toggleClass('open');
                }
            }

            $(".dropdown-toggle-split").click(
                function () {
                    $('.dropdown-menu.megamenu', this).not('.in .dropdown-menu.megamenu').stop(true, true).slideDown("slow");
                    $('.dropdown-menu.megamenu', this).addClass('show');

                    $(this).toggleClass('open');
                },
                function () {
                    $('.dropdown-menu.megamenu', this).not('.in .dropdown-menu.megamenu').stop(true, true).slideUp("slow");
                    $('.dropdown-menu.megamenu', this).removeClass('show');

                    $(this).toggleClass('open');
                }
            );
        });


    }

    public render(): React.ReactElement<IGlobalNavProps> {


        console.log(`Render 1 ` + new Date());
        const dt = new Date();
        let commandBarItems: any[] = [];

        if (this.state.terms.length > 0) {
            commandBarItems = this.state.terms.map((i) => {

                return (this.menuItems(i, ContextualMenuItemType.Header));
            });
        }

        if (!checkUser) {
            this._setCurrentUserInfo();
        }

        const _cLocation = cookies.get(ocbcurrentlocation)
        const _cLang = cookies.get(ocbcurrentlang)

        let _currentLang: any = this.state.selectedLanguage[0];

        if (_cLang !== undefined && _cLang[0].value !== 'en') {
            _currentLang = _cLang[0];
            strOCBIntranetHome = 'OCB Intranet Accueil';
            strHome = 'Accueil';

        }

        console.log('Render Count ' + _renderCount++);

        return (
            <>
                {
                    this.state.terms.length > 0 &&
                    <div className='notranslate'>
                        <nav className="navbar navbar-light navbar-expand-lg" role="navigation" id="myNavbar">
                            <a className="navbar-brand" ocb-href="https://msfintl.sharepoint.com/sites/ocb-intranet"><img src='https://msfintl.sharepoint.com/sites/ocb-intranet/_api/siteiconmanager/getsitelogo?siteurl=%27https://msfintl.sharepoint.com/sites/ocb-intranet%27&target=1&hash=%27637895990510000000%27' />
                                <span className='brandText'>{strOCBIntranetHome}</span></a>
                            <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#mainNav">
                                <span className="navbar-toggler-icon"></span>
                            </button>
                            <div className="collapse navbar-collapse" id="mainNav">
                                <ul className="navbar-nav ml-auto nav-fill" id='dynamicNav' dangerouslySetInnerHTML={this._renderDynamicNav(commandBarItems)}>

                                </ul>


                            </div>
                        </nav>
                        <nav className="navbar navbar-light navbar-expand-lg ocb-breadcrumb-navbar row" style={{margin:'auto'}} id="divBreadcrumb">
                            <div className="mr-auto">
                                <nav aria-label="breadcrumb" >
                                    <ol className="ocb-breadcrumb breadcrumb clsbreadHTML" id="breadHTML">
                                        <li className="breadcrumb-item breadHome" id="brdHome" ocb-href="https://msfintl.sharepoint.com/sites/ocb-intranet">{strHome}</li>

                                    </ol>
                                    <a id="redirectURL" href="#"></a>
                                </nav>
                            </div>
                            <ul className="navbar-nav ml-auto nav-flex-icons clsUserSelection">

                                <li className="nav-item dropdown">
                                    <Select
                                        styles={customStyles}
                                        className="basic-multi-select"
                                        classNamePrefix="select"
                                        id={'ddlLanguages1'}
                                        name={'ddlLanguages1'}
                                        options={dataOptions}
                                        defaultValue={_currentLang}
                                        onChange={e => {

                                            _selectedLang.push(e);

                                            cookies.set(ocbcurrentlang, _selectedLang, { path: '/', expires: (new Date(Date.now() + 15552000)), maxAge: 60 * 60 * 24 * 180 });

                                            this.setState({
                                                userLanguage: e.value
                                            })

                                            $('.breadHome').text(e.value === 'fr' ? 'Accueil' : 'Home');
                                            $('.brandText').text(e.value === 'fr' ? 'OCB Intranet Accueil' : 'OCB Intranet Home');
                                            _currentPageLanguage = 'tp';
                                            this._getTranslatedPageURL(e.value);

                                        }}
                                        onInputChange={key => {

                                        }}

                                    />
                                </li>
                                <li className="nav-item dropdown">
                                    <Select
                                        styles={customStyles}
                                        className="basic-multi-select"
                                        classNamePrefix="select"
                                        placeholder='Select Location'
                                        id={'ddlLocations'}
                                        name={'ddlLocations'}
                                        options={locations}
                                        defaultValue={cookies.get(ocbcurrentlocation)}
                                        onChange={e => {
                                            _selectedCountry.push(e);

                                            cookies.set(ocbcurrentlocation, _selectedCountry, { path: '/', expires: (new Date(Date.now() + 15552000)), maxAge: 60 * 60 * 24 * 180 });

                                        }}

                                    />
                                </li>
                            </ul>
                        </nav>

                        {_rendered = true}

                    </div>

                }

            </>

        );



    }


    private async _setCurrentUserInfo() {
        sp = spfi().using(spSPFx(this.props.wpcontext));
        try {
            const q = new URLSearchParams(window.location.search);
            const qLang: string = q.get("lang") !== null ? q.get("lang") : null;

            const _cLang = cookies.get(ocbcurrentlang)


            if (qLang !== null || (_cLang !== undefined && _cLang[0].value !== 'en')) {
                const currentLang = qLang !== null ? qLang : _cLang[0].value;
                this._setDataStates(currentLang);
                return;
            }

            const myProfile = await sp.profiles.myProperties();

            const userLang = myProfile.UserProfileProperties[77].Value;

            const currentUserLang = userLang.length > 0 ? userLang.split('-')[0] : 'en';

            this._setDataStates(currentUserLang);

        } catch (error) {
            console.log('Error (_setCurrentUserInfo) ' + error);
        }



    }

    private _setDataStates(langValue: string) {

        const selectionLang = dataOptions.filter(k => k.value === langValue).length > 0
            ? dataOptions.filter(x => x.value === langValue)[0]
            : dataOptions[0];

        this.setState({
            userLanguage: langValue,
            selectedLanguage: [{
                label: selectionLang.label,
                value: selectionLang.value,
                text: selectionLang.text
            }]
        });


        $('.breadHome').text(langValue === 'fr' ? 'Accueil' : 'Home');
        $('.brandText').text(langValue === 'fr' ? 'OCB Intranet Accueil' : 'OCB Intranet Home');

        checkUser = true;

        this._getTranslatedPageURL(langValue);

    }

    private async _getTranslatedPageURL(langValue: string) {


        if ((_currentPageLanguage.length < 1 || _currentPageLanguage === langValue) ||
            (window.location.href.toString().indexOf('?Mode=Edit') !== -1)) {
            return;
        }


        if (langValue !== 'en') {
            strHome = 'Accueil';
            strOCBIntranetHome = 'OCB Intranet Accueil';

            $('.breadHome').text(langValue === 'fr' ? 'Accueil' : 'Home');
            $('.brandText').text(langValue === 'fr' ? 'OCB Intranet Accueil' : 'OCB Intranet Home');

        }

        let resultURL: string = null;
        let checkAnotherPage = true;
        let pageId: number = 0;
        if (this.props.wpcontext.pageContext.site.serverRequestPath.toLocaleLowerCase().indexOf('sitepages') === -1)
            return;

        pageId = this.props.wpcontext.pageContext.listItem.id;

        const siteUrl = this.props.wpcontext.pageContext.site.absoluteUrl;

        const getURL = siteUrl + "/_api/sitepages/pages(" + pageId + ")?$select=Language,Url,Path,Office,Version,OData__SPTranslationSourceItemId,PageServerRelativeUrl,Translations&$expand=Translations,Office"
        $.ajax({
            url: getURL,
            type: "GET",
            headers: {
                "accept": "application/json;odata=verbose",
            },
            success: async (data) => {

                _currentPageLanguage = data.d.Language !== null ? data.d.Language.toString().split('-')[0] : '';

                if (langValue !== 'gb' && langValue !== 'en') {

                    if (data.d.Translations.Items.results.length < 1) {
                        checkAnotherPage = false
                        return resultURL;

                    }

                    resultURL = data.d.Translations.Items.results.filter((c: any) => c.Culture.indexOf(langValue) !== -1).length > 0
                        ? data.d.Translations.Items.results.filter((c: any) => c.Culture.indexOf(langValue) !== -1)[0].Path.DecodedUrl
                        : null;

                    if (resultURL !== null)
                        location.href = siteUrl + '/' + resultURL + '?lang=' + langValue;

                } else if (checkAnotherPage) {

                    const _searchURL = siteUrl.split('.com')[1] + '/' + data.d.Url;

                    const _item: any = await sp.web.getFileByServerRelativePath(_searchURL).getItem('*');

                    if (_item.OData__SPTranslationSourceItemId !== null)
                        this._getBackOriginalPage(_item.OData__SPTranslationSourceItemId);
                }
            },
            error: function (err) {
                console.log('Error (_getTranslatedPageURL) ' + JSON.stringify(err));
                return null;
            }
        })
            .catch((error) => {
                console.log(`Error (_getTranslatedPageURL)  ${error}`);
                return null;
            });


       // return resultURL;
    }

    private _getBackOriginalPage(pageGuid: any) {

        const siteUrl = this.props.wpcontext.pageContext.site.absoluteUrl;
        console.log(`absoluteUrl (_getBackOriginalPage) ` + siteUrl);

        const getURL = siteUrl + "/_api/web/lists/getbytitle('Site Pages')/GetItemByUniqueId('" + encodeURIComponent(pageGuid) + "')";
        $.ajax({
            url: getURL,
            type: "GET",
            headers: {
                "accept": "application/json;odata=verbose",
            },
            success: function (data) {

                location.href = data.d.OData__dlc_DocIdUrl.Url;

            },
            error: function (err) {
                console.log('Error (_getTranslatedStatuslang) ' + JSON.stringify(err));
                return null;
            }
        }).catch((error) => {
            console.log(`Error (_getBackOriginalPage)  ${error}`);
        });


    }

    private async _checkBreadCrumpsonNavigation() {

        if (_previusPageURL.length > 0 && _previusPageURL === this.props.wpcontext.pageContext.site.serverRequestPath) {

            this.interval = setTimeout(() => this._checkBreadCrumpsonNavigation(), 3000);
            return;
        }

        const q = new URLSearchParams(window.location.search);
        const qLang: string = q.get("lang") !== null ? q.get("lang") : null;


        let resultURL: string = null;
        let pageId: number = 0;
        if (this.props.wpcontext.pageContext.site.serverRequestPath.toLocaleLowerCase().indexOf('sitepages') === -1){
            //this.props.wpcontext.pageContext.list.title

            if (this.props.wpcontext.pageContext.list!==undefined){
                const _activeLang = this.state.userLanguage;
                let _homePage = 'https://msfintl.sharepoint.com/sites/ocb-intranet';
        
                if (_activeLang === 'fr'){
                    strHome = 'Accueil';
                    _homePage = 'https://msfintl.sharepoint.com/sites/ocb-intranet/_layouts/15/DocIdRedir.aspx?ID=ATA6V7EA5M2D-400264812-3321'
                }
        
                let _breadHTML = '<li class="breadcrumb-item breadHome" id="brdHome" ocb-href="'+ _homePage +'">' + strHome + '</li>';
                _breadHTML += '<li class="breadcrumb-item active">' + this.props.wpcontext.pageContext.list.title + '</li>';

                setTimeout(()=>{
                    $('#breadHTML').empty();
                    $('#breadHTML').append(_breadHTML);
    
                    document.cookie = ocbbreadmenu + '=' + _breadHTML + ';path=/';
                    document.cookie = ocbbreadmenuURL + '=' + this.props.wpcontext.pageContext.site.serverRequestPath + ';path=/';
                }, 1500)
               


            }
            return;
        }
           

        pageId = this.props.wpcontext.pageContext.listItem.id;


        const siteUrl = this.props.wpcontext.pageContext.site.absoluteUrl;


        const getURL = siteUrl + "/_api/web/lists/getbytitle('Site Pages')/items?$filter=Id eq " + pageId + "&$select=Title,Office"


        $.ajax({
            url: getURL,
            type: "GET",
            headers: {
                "accept": "application/json;odata=verbose",
            },
            success: async (_result) => {

                const _parentMenu = (_result.d.results[0].Office !== undefined && _result.d.results[0].Office.results.length > 0)
                    ? _result.d.results[0].Office.results[0].TermGuid
                    : null;

                const _title = _result.d.results[0].Title;

                if (_parentMenu !== null)
                    this.setBreadCrumb_FomLoad(_parentMenu, _title, 2);

                _previusPageURL = this.props.wpcontext.pageContext.site.serverRequestPath;

                console.log(_parentMenu);

            },
            error: function (err) {
                console.log('Error (_checkBreadCrumpsonNavigation) ' + JSON.stringify(err));
                return null;
            }
        }).then(() => {

            this.interval = setTimeout(() => this._checkBreadCrumpsonNavigation(), 2000);

        }).catch((error) => {
            console.log(`Error (_checkBreadCrumpsonNavigation)  ${error}`);
        });


        return resultURL;
    }

    private setBreadCrumb_FomLoad(_menuText: string, currentPageTitle: string, level: number) {

        $('#breadHTML').empty();
        const _activeLang = this.state.userLanguage;
        let _homePage = 'https://msfintl.sharepoint.com/sites/ocb-intranet';

        if (_activeLang === 'fr'){
            strHome = 'Accueil';
            _homePage = 'https://msfintl.sharepoint.com/sites/ocb-intranet/_layouts/15/DocIdRedir.aspx?ID=ATA6V7EA5M2D-400264812-3321'
        }

        let _breadHTML = '<li class="breadcrumb-item breadHome" id="brdHome" ocb-href="'+ _homePage +'">' + strHome + '</li>';
      
        let _allLinks: any = this.state.breadCrumb;
        _allLinks = _allLinks[2];
        let _currentLink = _allLinks.filter((x: any) => x.menuGuid.indexOf(_menuText) !== -1);
       

        if (_currentLink === undefined) {
            $('#breadHTML').append(_breadHTML);
            return;
        }
        _currentLink = _currentLink[0];
        let _currentMenuLink : string = _currentLink.link;

        const _headerId = _currentLink.headerId;

        let _subheader: any;
        if (_currentLink.key > 1)
            _subheader = _allLinks.filter((x: any) => x.menuId === _currentLink.menuId && x.key === 1)[0];

        const _headerMenu = _allLinks.filter((x: any) => x.headerId === _headerId && x.key === 0)[0];
        let _headerLink = _headerMenu.link === null ? '#' : _headerMenu.link;

        if (_activeLang === 'fr'){
            _headerLink = _headerMenu.frenchURL !== null ? _headerMenu.frenchURL : _headerLink;
            _currentMenuLink =  _currentLink.frenchURL!==null? _currentLink.frenchURL:_currentMenuLink;
        }
        else if (_activeLang === 'nl'){
            _headerLink = _headerMenu.dutchURL !== null ? _headerMenu.dutchURL : _headerLink;
            _currentMenuLink =  _currentLink.dutchURL!==null? _currentLink.dutchURL:_currentMenuLink;
        }

        if (level !== 0 && (_headerMenu.menuGuid !== _currentLink.menuGuid)) {
            _breadHTML += '<li class="breadcrumb-item" ocb-href="' + _headerLink + '">' + _headerMenu.content + '</li>';
        }

        let _addedSubHeader = false;
        if ((_subheader !== undefined && _subheader !== null) && _headerMenu.content !== _subheader.content) {
            let _subLink = _subheader.link === null ? '#' : _subheader.link;
            if (_activeLang === 'fr')
                _subLink = _subheader.frenchURL !== null ? _subheader.frenchURL : _subLink;
            else if (_activeLang === 'nl')
                _subLink = _subheader.dutchURL !== null ? _subheader.dutchURL : _subLink;

         /*   if (level !== 0 && (_headerMenu.menuGuid !== _currentLink.menuGuid)) {
                _breadHTML += '<li class="breadcrumb-item" ocb-href="' + _headerLink + '">' + _headerMenu.content + '</li>';
            }*/

            _breadHTML += '<li class="breadcrumb-item" ocb-href="' + _subLink + '">' + _subheader.content + '</li>';
            _addedSubHeader = true;
        }

        if (!_addedSubHeader || (_addedSubHeader && _subheader.menuGuid !== _currentLink.menuGuid))
            _breadHTML += '<li class="breadcrumb-item" ocb-href="' + _currentMenuLink + '">' + _currentLink.content + '</li>';

        if (currentPageTitle.toLowerCase().replace('&', '＆') !== _currentLink.content.toLowerCase().replace('&', '＆'))
            _breadHTML += '<li class="breadcrumb-item active">' + currentPageTitle + '</li>';
        //}

        $('#breadHTML').empty();
        $('#breadHTML').append(_breadHTML);

        document.cookie = ocbbreadmenu + '=' + _breadHTML + ';path=/';
        document.cookie = ocbbreadmenuURL + '=' + _currentMenuLink + ';path=/';

    }

    private menuItems(menuItem: any, itemType: ContextualMenuItemType) {

        const labelLang = menuItem.labels.filter((k: any) => k.languageTag.indexOf(this.state.userLanguage) !== -1);

        return ({
            key: menuItem.id,
            name: labelLang.length > 0 ? labelLang[0].name : menuItem.defaultLabel,
            itemType: itemType,
            href: (menuItem.localProperties !== undefined && menuItem.localProperties[0].properties !== undefined && menuItem.localProperties[0].properties.length > 0) ?
                (menuItem.localProperties[0].properties.filter((x: any) => x.key === "_Sys_Nav_SimpleLinkUrl")[0] !== undefined && menuItem.localProperties[0].properties.filter((x: any) => x.key === "_Sys_Nav_SimpleLinkUrl")[0].value !== undefined) ? menuItem.localProperties[0].properties.filter((x: any) => x.key === "_Sys_Nav_SimpleLinkUrl")[0].value : null
                : null,
            subMenuProps: menuItem.children.length > 0 ?
                { items: menuItem.children.map((i: any) => { return (this.menuItems(i, ContextualMenuItemType.Normal)); }) }
                : null,
            isSubMenu: itemType !== ContextualMenuItemType.Header,
            subHeader: (itemType !== ContextualMenuItemType.Header) ?
                ((menuItem.localProperties !== undefined && menuItem.localProperties[0].properties !== undefined && menuItem.localProperties[0].properties.length > 0
                    && menuItem.children.length === 0)
                    ? ContextualMenuItemType.Normal
                    : ContextualMenuItemType.Divider)
                : ContextualMenuItemType.Header,
            frenchURL: menuItem.properties.filter((x: any) => x.key === "FrenchURL").length > 0 ? menuItem.properties.filter((x: any) => x.key === "FrenchURL")[0].value : null,
            dutchURL: menuItem.properties.filter((x: any) => x.key === "DutchURL").length > 0 ? menuItem.properties.filter((x: any) => x.key === "DutchURL")[0].value : null
        });


    }

    private _renderDynamicNav(navMenu: any[]) {

        console.log(`Menu Render started` + new Date());
        let html: string = '';
        let _tempBread: any = [];
        let _breadIndex = 0;
        let _headerIndex = 0;
        let _menuIndex = 0;
        navMenu.map((val) => {
            _breadIndex = 0;
            _menuIndex++;
            _headerIndex++;
            if (val.subHeader === ContextualMenuItemType.Header && val.subMenuProps !== null && val.subMenuProps.items.length > 0) {

                html += `<li class="nav-item has-megamenu dropdown">
                <a class="nav-link dropdown-toggle-split" id="servicesDropdown" role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" menuindex="`+ _menuIndex + `">` + val.name + ` 
                <img class="ocbMenuIcon" src="https://msfintl.sharepoint.com/:u:/r/sites/ocb-intranet/SiteAssets/intranet/img/chevron-down.svg"></img></a>
                <div class="dropdown-menu megamenu" aria-labelledby="servicesDropdown">
                `;

                _tempBread.push({ key: _breadIndex++, content: val.name, link: val.href, menuId: _menuIndex, headerId: _headerIndex, menuGuid: val.key, frenchURL: val.frenchURL, dutchURL: val.dutchURL });

                if (val.subMenuProps !== null) {
                    let i: number = 0;

                    const _count = val.subMenuProps.items.filter((x: any) => x.subHeader === ContextualMenuItemType.Divider && x.href === null && x.subMenuProps !== null).length;

                    $.each(val.subMenuProps.items, (subKey, subValue) => {

                        if (i % 4 === 0)
                            html += `<div class="d-md-flex align-items-start justify-content-start">`;


                        if (subValue.subHeader === ContextualMenuItemType.Divider) {

                            _breadIndex = 1;
                            _menuIndex++;
                            html += `<div class="col-sm-3">
                                     <div class="dropdown-header" menuindex="`+ _menuIndex + `">` + subValue.name + `</div>`;


                            _tempBread.push({ key: _breadIndex++, content: subValue.name, link: subValue.href, menuId: _menuIndex, headerId: _headerIndex, menuGuid: subValue.key, frenchURL: subValue.frenchURL, dutchURL: subValue.dutchURL });

                            if (subValue.subMenuProps !== null) {

                                $.each(subValue.subMenuProps.items, (linkKey, linkVal) => {
                                    html += `<a class="dropdown-item" menuindex="` + _menuIndex + `">` + linkVal.name + `</a>`;

                                    _tempBread.push({ key: _breadIndex++, content: linkVal.name, link: linkVal.href, menuId: _menuIndex, headerId: _headerIndex, menuGuid: linkVal.key, frenchURL: linkVal.frenchURL, dutchURL: linkVal.dutchURL });
                                });
                            }

                            html += `</div>`;

                            i++;


                        } else if (_count <= 0) {
                            _breadIndex = 1;
                            _menuIndex++;
                            html += `<a class="dropdown-header col-sm-3"  menuindex="` + _menuIndex + `">` + subValue.name + `</a>`;

                            _tempBread.push({ key: _breadIndex++, content: subValue.name, link: subValue.href, menuId: _menuIndex, headerId: _headerIndex, menuGuid: subValue.key, frenchURL: subValue.frenchURL, dutchURL: subValue.dutchURL });

                            i++;
                        }


                        if (i % 4 === 0)
                            html += `</div>`;

                    });
                }
                html += `</div>
                         </li>`;

            } else if (val.subHeader === ContextualMenuItemType.Header && val.href !== null) {
                html += `<li class="nav-item directmenu"><a menuindex="` + _menuIndex + `" class="nav-link">` + val.name + `</a></li>`;
                _tempBread.push({ key: _breadIndex++, content: val.name, link: val.href, menuId: _menuIndex, headerId: _headerIndex, menuGuid: val.key, frenchURL: val.frenchURL, dutchURL: val.dutchURL });
            }


        });

        this.state.breadCrumb.push(...this.state.breadCrumb, _tempBread);

        console.log(`Menu Render stopped ` + new Date());

        this._checkBreadCrumpsonNavigation();

        return { __html: html };

    }

    private async _getAllCountries() {

        var _allCountry = await sp.termStore.groups.getById('c6151ee4-57e6-47fc-b68f-15375eae05d1').sets.getById('915c9beb-8667-41eb-9557-94c93ae2e4db').getAllChildrenAsOrderedTree({ retrieveProperties: true })
            .then((_result: any) => {
                $.each(_result, (key, val) => {
                    const _country = { value: val.defaultLabel, text: val.defaultLabel, label: val.defaultLabel };
                    locations.push(_country)
                })
            });


        return _allCountry;

    }

}
