/**
 * Tests for the Tempest extras shown in the dashboard banner weather row.
 *
 * The backend omits any extra the user did not opt into persisting, so every
 * field is optional and the banner must render without it instead of throwing.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, screen, waitFor } from '@testing-library/svelte';
import { renderTyped } from '../../../../../test/render-helpers';
import { t } from '$lib/i18n';
import type { BannerConfig } from '$lib/stores/settings';
import type { LatestWeatherResponse } from '$lib/types/detection.types';

// Minimal store contract so a test can pick the temperature/measurement unit.
const { dashboardUnit } = vi.hoisted(() => {
  const dashboardUnit: { value: 'celsius' | 'fahrenheit' } = { value: 'celsius' };
  return { dashboardUnit };
});

vi.mock('$lib/stores/settings', async importOriginal => {
  const actual = await importOriginal<typeof import('$lib/stores/settings')>();
  return {
    ...actual,
    dashboardSettings: {
      subscribe(run: (_value: { temperatureUnit: string }) => void) {
        run({ temperatureUnit: dashboardUnit.value });
        return () => {};
      },
    },
  };
});

import BannerCard from './BannerCard.svelte';

const bannerConfig: BannerConfig = {
  showImage: false,
  imagePath: '',
  title: '',
  description: '',
  showLocationMap: false,
  showWeather: true,
};

function stubWeather(tempestExtras: LatestWeatherResponse['tempest_extras']) {
  const body: LatestWeatherResponse = {
    hourly: { time: '2026-10-07T12:00:00Z', temperature: 12, feels_like: 11, wind_speed: 2 },
    tempest_extras: tempestExtras,
    timestamp: '2026-10-07T12:00:00Z',
  };
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(body) });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function renderBanner(tempestExtras: LatestWeatherResponse['tempest_extras']) {
  const fetchMock = stubWeather(tempestExtras);
  renderTyped(BannerCard, { props: { config: bannerConfig } });
  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
}

const uvTitle = () => t('detections.weather.labels.uvIndex');
const lightningTitle = () => t('detections.weather.labels.lightningDistance');

describe('BannerCard Tempest extras', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    dashboardUnit.value = 'celsius';
  });

  it('shows lightning distance in kilometers for metric', async () => {
    await renderBanner({ lightning_count: 2, lightning_distance: 10 });

    const lightning = await screen.findByTitle(lightningTitle());
    expect(lightning.textContent).toContain('10.0 km');
  });

  it('shows lightning distance in miles for imperial', async () => {
    dashboardUnit.value = 'fahrenheit';
    await renderBanner({ lightning_count: 2, lightning_distance: 10 });

    const lightning = await screen.findByTitle(lightningTitle());
    expect(lightning.textContent).toContain('6.2 mi');
    expect(lightning.textContent).not.toContain('km');
  });

  it('renders without UV or lightning when only illuminance was persisted', async () => {
    await renderBanner({ illuminance: 9000 });

    await screen.findAllByText(/m\/s/);
    expect(screen.queryByTitle(uvTitle())).toBeNull();
    expect(screen.queryByTitle(lightningTitle())).toBeNull();
  });

  it('shows a UV index of zero', async () => {
    await renderBanner({ uv_index: 0 });

    expect(await screen.findByTitle(uvTitle())).toBeTruthy();
  });

  it('shows the lightning count without a distance when distance is omitted', async () => {
    await renderBanner({ lightning_count: 3 });

    const lightning = await screen.findByTitle(lightningTitle());
    expect(lightning.textContent).not.toContain('km');
  });

  it('hides lightning when the strike count is zero', async () => {
    await renderBanner({ lightning_count: 0, lightning_distance: 5 });

    await screen.findAllByText(/m\/s/);
    expect(screen.queryByTitle(lightningTitle())).toBeNull();
  });
});
