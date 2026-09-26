import { test, expect } from '@playwright/test';

test('every lesson has a bounded, labelled and readable concept model', async ({ page, request }) => {
  test.setTimeout(90000);
  const response = await request.get('/api/content/index');
  expect(response.ok()).toBeTruthy();
  const { lessonIndex } = await response.json();
  expect(lessonIndex).toHaveLength(26);

  for (const lesson of lessonIndex) {
    await page.goto(`/lesson/${lesson.slug}`);
    const diagram = page.locator('[data-diagram]');
    await expect(diagram, `${lesson.title} has a concept model`).toBeVisible();
    await expect(diagram.locator('.diagram__header h3')).not.toBeEmpty();
    await expect(diagram.locator('.diagram__cues li')).toHaveCount(2);
    await expect(diagram).toHaveAttribute('data-scene-depth', '3d');
    await expect(diagram.getByRole('button', { name: /Change 3D viewing angle/ })).toBeVisible();

    const visual = await diagram.evaluate(element => {
      const svg = element.querySelector('svg');
      // Ignore the arrow-head path inside <defs>; it is intentionally filled
      // rather than stroked. Measure a visible drawing primitive instead.
      const line = element.querySelector('svg > line, svg > polyline, svg > path, svg > circle, svg > rect');
      const label = element.querySelector('text');
      return {
        svgWidth: svg.getBoundingClientRect().width,
        stroke: getComputedStyle(line).stroke,
        labelFill: getComputedStyle(label).fill,
        overflow: element.scrollWidth - element.clientWidth,
      };
    });
    expect(visual.svgWidth, `${lesson.title} model should not stretch into a poster`).toBeLessThanOrEqual(681);
    expect(visual.stroke, `${lesson.title} needs visible physics lines`).not.toBe('none');
    expect(visual.overflow, `${lesson.title} model should fit its card`).toBeLessThanOrEqual(1);
    expect(visual.labelFill, `${lesson.title} needs visible labels`).not.toBe('rgba(0, 0, 0, 0)');
  }
});

test('the concept model stays readable in dark mode and can replay', async ({ page }) => {
  await page.goto('/lesson/kinematics');
  await page.getByRole('button', { name: 'Switch between light and dark' }).click();
  const diagram = page.locator('[data-diagram]');
  const colours = await diagram.evaluate(element => ({
    stroke: getComputedStyle(element.querySelector('line')).stroke,
    label: getComputedStyle(element.querySelector('text')).fill,
    surface: getComputedStyle(element.querySelector('.diagram__stage')).backgroundColor,
  }));
  expect(colours.stroke).not.toBe('none');
  expect(colours.label).not.toBe('rgb(0, 0, 0)');
  expect(colours.surface).not.toBe('rgba(0, 0, 0, 0)');

  await page.getByRole('button', { name: /Replay .* drawing/ }).click();
  await expect(diagram).toHaveClass(/is-animating/);
});

test('the three-angle model viewer is keyboard operable and preserves its labels', async ({ page }) => {
  await page.goto('/lesson/kinematics');
  const diagram = page.locator('[data-diagram]');
  const view = diagram.getByRole('button', { name: /Change 3D viewing angle/ });

  await view.focus();
  await page.keyboard.press('Enter');
  await expect(diagram).toHaveAttribute('data-view-angle', 'left');
  await expect(view).toHaveText('3D view · Relationship');
  await expect(diagram.locator('[data-diagram-state]')).toContainText('separate the spatial layers');
  await expect(diagram.locator('.diagram__cues li').filter({ hasText: 'Gradient gives acceleration' })).toBeVisible();

  await page.keyboard.press('Space');
  await expect(diagram).toHaveAttribute('data-view-angle', 'right');
  await expect(view).toHaveAttribute('aria-label', /current view: outcome/i);
  await expect(diagram.locator('[data-diagram-state]')).toContainText('path or field');
});
