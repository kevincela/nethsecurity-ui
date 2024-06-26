<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import FormLayout from '@/components/standalone/FormLayout.vue'
import {
  NeBadge,
  NeTitle,
  NeButton,
  NeInlineNotification,
  NeSkeleton,
  NeTextInput,
  focusElement,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import type { SubscriptionDataType } from '@/views/standalone/system/SubscriptionView.vue'
import type { PropType } from 'vue'
import { ref, toRefs } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import { validateRequired } from '@/lib/validation'
import { computed } from 'vue'

const { t } = useI18n()

const props = defineProps({
  subscriptionData: {
    type: Object as PropType<SubscriptionDataType | null>,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})
const { subscriptionData, loading } = toRefs(props)
const emit = defineEmits(['subscription-update'])

const authTokenRef = ref()
const authToken = ref('')
const isProcessingRequest = ref(false)
const errors = ref({
  authToken: '',
  request: ''
})

const expirationDateString = computed(() => {
  if (!subscriptionData.value) {
    return ''
  }

  return subscriptionData.value.expiration == 0
    ? t('standalone.subscription.no_expiration')
    : new Date(subscriptionData.value.expiration).toLocaleDateString()
})

function validateAuthToken() {
  errors.value.authToken = ''

  let { valid, errMessage } = validateRequired(authToken.value)

  if (!valid) {
    errors.value.authToken = t(errMessage as string)
    focusElement(authTokenRef)
  }

  return valid
}

async function subscribe() {
  try {
    errors.value.request = ''

    if (!validateAuthToken()) {
      return
    }

    isProcessingRequest.value = true
    await ubusCall('ns.subscription', 'register', { secret: authToken.value })
    authToken.value = ''
    emit('subscription-update')
  } catch (e: any) {
    if (e.response.data.message == 'invalid_secret_or_server_not_found') {
      errors.value.request = t('standalone.subscription.invalid_secret_or_server_not_found')
    } else {
      errors.value.request = t(getAxiosErrorMessage(e))
    }
  } finally {
    isProcessingRequest.value = false
  }
}

async function cancelSubscription() {
  try {
    errors.value.request = ''

    isProcessingRequest.value = true
    await ubusCall('ns.subscription', 'unregister')
    emit('subscription-update')
  } catch (e: any) {
    errors.value.request = t(getAxiosErrorMessage(e))
  } finally {
    isProcessingRequest.value = false
  }
}
</script>

<template>
  <FormLayout
    :title="t('standalone.subscription.unit_subscription')"
    :description="t('standalone.subscription.unit_subscription_description')"
    class="max-w-3xl"
  >
    <NeSkeleton :lines="5" v-if="loading" />
    <template v-else>
      <template v-if="subscriptionData">
        <div class="flex flex-col gap-y-8">
          <NeTextInput
            :label="t('standalone.subscription.system_id')"
            :disabled="true"
            :modelValue="subscriptionData.systemd_id"
          />
          <div>
            <NeTitle level="h4">{{ t('standalone.subscription.plan') }}</NeTitle>
            <p class="text-sm font-normal text-gray-500 dark:text-gray-400">
              {{ subscriptionData.plan }}
            </p>
          </div>
          <div>
            <NeTitle level="h4">{{ t('standalone.subscription.expiration') }}</NeTitle>
            <p class="text-sm font-normal text-gray-500 dark:text-gray-400">
              {{ expirationDateString }}
            </p>
          </div>
          <div class="align-center flex flex-row">
            <NeTitle class="mr-4 inline-block" style="margin-bottom: 0" level="h4">{{
              t('standalone.subscription.status')
            }}</NeTitle>
            <NeBadge
              :text="
                subscriptionData.active
                  ? t('standalone.subscription.active')
                  : t('standalone.subscription.inactive')
              "
              :kind="subscriptionData.active ? 'success' : 'warning'"
              size="sm"
            />
          </div>
          <NeInlineNotification
            v-if="errors.request"
            kind="error"
            :title="t('error.cancel_registration_error')"
            :description="errors.request"
          />
          <div>
            <NeButton
              kind="tertiary"
              class="-ml-2.5"
              :disabled="isProcessingRequest"
              :loading="isProcessingRequest"
              @click="cancelSubscription"
              >{{ t('standalone.subscription.cancel_registration') }}</NeButton
            >
          </div>
        </div>
      </template>
      <template v-else>
        <NeTextInput
          :label="t('standalone.subscription.authentication_token')"
          :placeholder="t('standalone.subscription.authentication_token_placeholder')"
          :invalidMessage="errors.authToken"
          :disabled="false"
          v-model.trim="authToken"
          ref="authTokenRef"
        />
        <NeInlineNotification
          v-if="errors.request"
          kind="error"
          :title="t('error.register_unit_error')"
          :description="errors.request"
          class="my-4"
        />
        <div class="mt-6 flex justify-end">
          <NeButton
            kind="primary"
            @click="subscribe"
            :disabled="isProcessingRequest"
            :loading="isProcessingRequest"
            >{{ t('standalone.subscription.register') }}</NeButton
          >
        </div>
      </template>
    </template>
  </FormLayout>
</template>
