import enabledData from "../data/adsense/enabled.json";
import adsTxtData from "../data/adsense/ads-txt.json";
import headScriptData from "../data/adsense/head-script.json";
import displayData from "../data/adsense/display.json";
import infeedData from "../data/adsense/infeed.json";
import inarticleData from "../data/adsense/inarticle.json";
import multiplexData from "../data/adsense/multiplex.json";

export interface AdsenseDisplayConfig {
  code: string;
  above_title: boolean;
  before_content: boolean;
  after_h2: boolean;
  after_h3: boolean;
  after_h4: boolean;
}

export interface AdsenseSlotConfig {
  code: string;
  position?: number;
}

export interface AdsenseInarticleConfig {
  code: string;
  min_paragraphs: number;
  insert_after_paragraph: number;
}

export interface AdsenseConfig {
  enabled: boolean;
  ads_txt: string;
  head_script: string;
  display: AdsenseDisplayConfig;
  infeed: AdsenseSlotConfig;
  inarticle: AdsenseInarticleConfig;
  multiplex: AdsenseSlotConfig;
}

export function getAdsenseConfig(): AdsenseConfig {
  return {
    enabled: enabledData.enabled,
    ads_txt: adsTxtData.content,
    head_script: headScriptData.script,
    display: displayData as AdsenseDisplayConfig,
    infeed: infeedData,
    inarticle: inarticleData as AdsenseInarticleConfig,
    multiplex: multiplexData,
  };
}

export function isAdsenseActive(config: AdsenseConfig = getAdsenseConfig()): boolean {
  return config.enabled;
}

export function hasHeadScript(config: AdsenseConfig = getAdsenseConfig()): boolean {
  return isAdsenseActive(config) && Boolean(config.head_script?.trim());
}

function hasAdCode(code?: string): boolean {
  return Boolean(code?.trim());
}

function displayReady(config: AdsenseConfig): boolean {
  return isAdsenseActive(config) && hasAdCode(config.display.code);
}

export function hasDisplayAd(config: AdsenseConfig = getAdsenseConfig()): boolean {
  const { display } = config;
  return (
    displayReady(config) &&
    (display.above_title ||
      display.before_content ||
      display.after_h2 ||
      display.after_h3 ||
      display.after_h4)
  );
}

export function displayAboveTitle(config: AdsenseConfig = getAdsenseConfig()): boolean {
  return displayReady(config) && config.display.above_title;
}

export function displayBeforeContent(config: AdsenseConfig = getAdsenseConfig()): boolean {
  return displayReady(config) && config.display.before_content;
}

export function hasDisplayInBody(config: AdsenseConfig = getAdsenseConfig()): boolean {
  const { display } = config;
  return displayReady(config) && (display.after_h2 || display.after_h3 || display.after_h4);
}

export function hasInarticleAd(config: AdsenseConfig = getAdsenseConfig()): boolean {
  const { inarticle } = config;
  return isAdsenseActive(config) && hasAdCode(inarticle.code);
}

export function hasInfeedAd(config: AdsenseConfig = getAdsenseConfig()): boolean {
  return isAdsenseActive(config) && hasAdCode(config.infeed.code);
}

export function hasMultiplexAd(config: AdsenseConfig = getAdsenseConfig()): boolean {
  return isAdsenseActive(config) && hasAdCode(config.multiplex.code);
}
