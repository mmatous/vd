#!/usr/bin/env sh

TESTDIR='.test'
TESTFNAME='background-testable.js'

mkdir -p $TESTDIR
cp './extension/vd-background.js' "./$TESTDIR/$TESTFNAME"
sed -i 's/^async function/export async function/g' "./$TESTDIR/$TESTFNAME"
sed -i 's/^function/export function/g' "./$TESTDIR/$TESTFNAME"
sed -i 's/^const/export const/g' "./$TESTDIR/$TESTFNAME"
